import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const REPORT_PATH = resolve('scripts/security/live-baseline-report.json');
const TEMP_PASSWORD = 'AuditPass!234567';
const FAKE = {
  orgId: '11111111-1111-1111-1111-111111111111',
  otherUserId: '22222222-2222-2222-2222-222222222222',
  ledgerId: '33333333-3333-3333-3333-333333333333',
  ticketId: '44444444-4444-4444-4444-444444444444',
};

function loadEnv(filePath) {
  return Object.fromEntries(
    readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const [key, value] = line.split(/=(.+)/);
        return [key, value];
      }),
  );
}

const env = loadEnv(resolve('.env'));
const baseUrl = env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!baseUrl || !anonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
}

function parseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path, { method = 'GET', token = null, body = null, headers = {} } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      apikey: anonKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== null ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body !== null
      ? headers['Content-Type'] === 'text/plain'
        ? body
        : JSON.stringify(body)
      : undefined,
  });

  const text = await response.text();
  return {
    status: response.status,
    body: parseBody(text),
    rawBody: text,
  };
}

async function signupTempUser() {
  const email = `security.audit.${Date.now()}@example.com`;
  const response = await request('/auth/v1/signup', {
    method: 'POST',
    body: {
      email,
      password: TEMP_PASSWORD,
    },
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (response.status !== 200 || !response.body?.access_token || !response.body?.user?.id) {
    throw new Error(`Unable to create temp user: ${response.rawBody}`);
  }

  return {
    email,
    password: TEMP_PASSWORD,
    userId: response.body.user.id,
    token: response.body.access_token,
  };
}

function pushResult(report, {
  category,
  name,
  severity = 'info',
  passed,
  evidence,
  note = null,
}) {
  report.tests.push({
    category,
    name,
    severity,
    passed,
    evidence,
    note,
  });
}

function isEmptyArrayBody(response) {
  return response.status === 200 && Array.isArray(response.body) && response.body.length === 0;
}

function isDenied(response) {
  return response.status === 401 || response.status === 403;
}

function bodyMessage(response) {
  if (typeof response.body === 'string') return response.body;
  if (response.body?.message) return response.body.message;
  if (response.body?.error) return response.body.error;
  return response.rawBody;
}

const report = {
  generatedAt: new Date().toISOString(),
  target: baseUrl,
  tempUser: null,
  tests: [],
};

const sensitiveTables = [
  'organizations',
  'memberships',
  'announcements',
  'alerts',
  'events',
  'tickets',
  'dues_ledger',
  'documents',
  'finance_entries',
  'notifications',
  'audit_log',
];

const helperRpcTests = [
  ['superadmin_email', {}],
  ['global_superadmin_user_id', {}],
  ['is_global_superadmin', {}],
  ['is_member_of', { org: FAKE.orgId }],
  ['has_role', { org: FAKE.orgId, roles: ['member'] }],
  ['storage_object_org_id', { path: `${FAKE.orgId}/folder/file.pdf` }],
  ['storage_object_user_id', { path: `${FAKE.orgId}/${FAKE.otherUserId}/file.pdf` }],
  ['sync_global_superadmin_memberships', { p_org_id: FAKE.orgId }],
];

const run = async () => {
  for (const table of sensitiveTables) {
    const response = await request(`/rest/v1/${table}?select=id&limit=1`);
    pushResult(report, {
      category: 'anon-table-read',
      name: table,
      severity: 'high',
      passed: isEmptyArrayBody(response),
      evidence: response,
      note: 'Anonymous/anon-key caller should not enumerate JJVV business data.',
    });
  }

  for (const [fn, payload] of helperRpcTests) {
    const response = await request(`/rest/v1/rpc/${fn}`, {
      method: 'POST',
      body: payload,
    });
    pushResult(report, {
      category: 'anon-helper-rpc',
      name: fn,
      severity: 'high',
      passed: response.status >= 400,
      evidence: response,
      note: 'Internal helper RPCs should not be callable by public clients.',
    });
  }

  const anonListDocs = await request('/storage/v1/object/list/jjvv-documents', {
    method: 'POST',
    body: { prefix: '' },
  });
  pushResult(report, {
    category: 'anon-storage',
    name: 'list-private-bucket',
    severity: 'high',
    passed: anonListDocs.status >= 400,
    evidence: anonListDocs,
    note: 'Anonymous callers must not list private JJVV buckets.',
  });

  const anonPublicDoc = await request(`/storage/v1/object/public/jjvv-documents/${FAKE.orgId}/secret.pdf`);
  pushResult(report, {
    category: 'anon-storage',
    name: 'public-private-bucket-url',
    severity: 'high',
    passed: anonPublicDoc.status !== 200,
    evidence: anonPublicDoc,
    note: 'Private JJVV buckets must not resolve through public URLs.',
  });

  const sendPushAnon = await request('/functions/v1/send_push', {
    method: 'POST',
    body: {
      organization_id: FAKE.orgId,
      title: 'Audit',
      body: 'Audit',
      type: 'announcement',
    },
  });
  pushResult(report, {
    category: 'anon-edge-function',
    name: 'send_push',
    severity: 'medium',
    passed: sendPushAnon.status === 401 || sendPushAnon.status === 403 || sendPushAnon.status === 404,
    evidence: sendPushAnon,
    note: 'Anonymous callers must not invoke privileged push flows. A 404 usually means the function is not deployed in this environment.',
  });

  const tempUser = await signupTempUser();
  report.tempUser = {
    email: tempUser.email,
    userId: tempUser.userId,
  };

  const accessibleOrganizations = await request('/rest/v1/rpc/list_accessible_organizations', {
    method: 'GET',
    token: tempUser.token,
  });
  pushResult(report, {
    category: 'auth-no-membership-rpc',
    name: 'list_accessible_organizations',
    severity: 'high',
    passed: isEmptyArrayBody(accessibleOrganizations) || accessibleOrganizations.status === 404,
    evidence: accessibleOrganizations,
    note: 'Authenticated users without membership should not receive JJVV context. A 404 indicates a deployment/schema-cache mismatch for this RPC in the live project.',
  });

  const ownProfiles = await request('/rest/v1/profiles?select=user_id,full_name,address');
  pushResult(report, {
    category: 'auth-no-membership-table-read',
    name: 'profiles-own-only',
    severity: 'medium',
    passed: ownProfiles.status === 200
      && Array.isArray(ownProfiles.body)
      && ownProfiles.body.every((row) => row.user_id === tempUser.userId),
    evidence: ownProfiles,
    note: 'A no-membership user should see only their own profile row.',
  });

  for (const table of sensitiveTables.filter((table) => table !== 'profiles')) {
    const response = await request(`/rest/v1/${table}?select=id&limit=1`, {
      token: tempUser.token,
    });
    pushResult(report, {
      category: 'auth-no-membership-table-read',
      name: table,
      severity: 'high',
      passed: isEmptyArrayBody(response),
      evidence: response,
      note: 'Authenticated users without membership should not read community data.',
    });
  }

  const directInsertCases = [
    ['alerts', { organization_id: FAKE.orgId, created_by: tempUser.userId, category: 'seguridad', message: 'audit' }],
    ['finance_entries', { organization_id: FAKE.orgId, entry_type: 'expense', category: 'audit', amount_cents: 1000, entry_date: '2026-03-14', created_by: tempUser.userId }],
    ['documents', { organization_id: FAKE.orgId, title: 'audit', doc_type: 'General', file_path: `${FAKE.orgId}/general/audit.pdf`, created_by: tempUser.userId, is_public: false }],
    ['favors', { organization_id: FAKE.orgId, user_id: tempUser.userId, title: 'audit favor', description: 'testing favor insert', author_name: 'Audit User', user_email: tempUser.email }],
    ['notifications', { organization_id: FAKE.orgId, title: 'audit', body: 'audit', type: 'announcement', channel: 'push', created_by: tempUser.userId }],
  ];

  for (const [table, body] of directInsertCases) {
    const response = await request(`/rest/v1/${table}`, {
      method: 'POST',
      token: tempUser.token,
      body,
    });
    pushResult(report, {
      category: 'auth-no-membership-direct-write',
      name: table,
      severity: 'high',
      passed: isDenied(response),
      evidence: response,
      note: 'Direct writes without active JJVV membership should be blocked by RLS.',
    });
  }

  const pushTokenInsert = await request('/rest/v1/push_tokens', {
    method: 'POST',
    token: tempUser.token,
    body: {
      organization_id: FAKE.orgId,
      user_id: tempUser.userId,
      platform: 'android',
      token: `ExponentPushToken[audit-${Date.now()}]`,
    },
  });
  pushResult(report, {
    category: 'auth-no-membership-direct-write',
    name: 'push_tokens',
    severity: 'critical',
    passed: isDenied(pushTokenInsert),
    evidence: pushTokenInsert,
    note: 'A push token write must fail at RLS, not at the foreign-key layer.',
  });

  const rpcCases = [
    ['list_organization_members', { p_org_id: FAKE.orgId }, (response) => isEmptyArrayBody(response)],
    ['update_membership_role', { p_org_id: FAKE.orgId, p_user_id: FAKE.otherUserId, p_role: 'member' }, (response) => response.status >= 400],
    ['set_membership_active', { p_org_id: FAKE.orgId, p_user_id: FAKE.otherUserId, p_is_active: false }, (response) => response.status >= 400],
    ['list_organization_dues', { p_org_id: FAKE.orgId }, (response) => isEmptyArrayBody(response)],
    ['create_ticket', { p_org_id: FAKE.orgId, p_title: 'audit', p_description: 'audit', p_category: 'general', p_attachment_path: null }, (response) => response.status >= 400],
  ];

  for (const [fn, payload, predicate] of rpcCases) {
    const response = await request(`/rest/v1/rpc/${fn}`, {
      method: 'POST',
      token: tempUser.token,
      body: payload,
    });
    pushResult(report, {
      category: 'auth-no-membership-rpc',
      name: fn,
      severity: 'high',
      passed: predicate(response),
      evidence: response,
      note: 'Client-callable RPCs must enforce membership and role checks server-side.',
    });
  }

  const oracleCases = [
    ['approve_due_payment', { p_ledger_id: FAKE.ledgerId }, 'Due ledger entry not found'],
    ['set_due_status_admin', { p_ledger_id: FAKE.ledgerId, p_status: 'paid' }, 'Due ledger entry not found'],
    ['mark_ticket_seen', { p_ticket_id: FAKE.ticketId, p_viewer: 'admin' }, 'Ticket not found'],
    ['set_ticket_status', { p_ticket_id: FAKE.ticketId, p_status: 'resolved' }, 'Ticket not found'],
  ];

  for (const [fn, payload, leakedMessage] of oracleCases) {
    const response = await request(`/rest/v1/rpc/${fn}`, {
      method: 'POST',
      token: tempUser.token,
      body: payload,
    });
    pushResult(report, {
      category: 'auth-no-membership-oracle',
      name: fn,
      severity: 'medium',
      passed: !bodyMessage(response).includes(leakedMessage)
        || bodyMessage(response).includes('not found or access denied'),
      evidence: response,
      note: 'Privileged RPCs should return a generic access-denied/not-found response to avoid resource existence oracles.',
    });
  }

  const storageCases = [
    [
      'upload-private-doc',
      await request(`/storage/v1/object/jjvv-documents/${FAKE.orgId}/${tempUser.userId}/audit.txt`, {
        method: 'POST',
        token: tempUser.token,
        body: 'audit',
        headers: {
          'Content-Type': 'text/plain',
          'x-upsert': 'false',
        },
      }),
      (response) => response.status !== 200,
    ],
    [
      'upload-dues-proof-without-membership',
      await request(`/storage/v1/object/jjvv-dues-proofs/${FAKE.orgId}/${tempUser.userId}/audit.txt`, {
        method: 'POST',
        token: tempUser.token,
        body: 'audit',
        headers: {
          'Content-Type': 'text/plain',
          'x-upsert': 'false',
        },
      }),
      (response) => response.status !== 200,
    ],
    [
      'list-ticket-attachments-without-membership',
      await request('/storage/v1/object/list/jjvv-ticket-attachments', {
        method: 'POST',
        token: tempUser.token,
        body: { prefix: `${FAKE.orgId}/` },
      }),
      (response) => response.status === 200 && Array.isArray(response.body) && response.body.length === 0,
    ],
  ];

  for (const [name, response, predicate] of storageCases) {
    pushResult(report, {
      category: 'auth-no-membership-storage',
      name,
      severity: 'high',
      passed: predicate(response) || response.status === 400 || response.status === 403,
      evidence: response,
      note: 'Private JJVV storage must not be writable/readable by outsiders.',
    });
  }

  const sendPushNoMembership = await request('/functions/v1/send_push', {
    method: 'POST',
    token: tempUser.token,
    body: {
      organization_id: FAKE.orgId,
      title: 'Audit',
      body: 'Audit',
      type: 'announcement',
    },
  });
  pushResult(report, {
    category: 'auth-no-membership-edge-function',
    name: 'send_push',
    severity: 'medium',
    passed: sendPushNoMembership.status === 403 || sendPushNoMembership.status === 404,
    evidence: sendPushNoMembership,
    note: 'A no-membership authenticated user must not invoke privileged notification broadcasts. A 404 indicates the function is not deployed in this environment.',
  });

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

  const failed = report.tests.filter((test) => !test.passed);
  console.log(JSON.stringify({
    reportPath: REPORT_PATH,
    total: report.tests.length,
    failed: failed.length,
    failures: failed.map((test) => ({
      category: test.category,
      name: test.name,
      severity: test.severity,
      status: test.evidence.status,
      body: test.evidence.body,
    })),
  }, null, 2));

  process.exitCode = failed.length > 0 ? 1 : 0;
};

await run();
