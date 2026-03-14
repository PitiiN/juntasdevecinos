import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

const REPORT_PATH = resolve('scripts/security/live-matrix-report.json');
const DEFAULT_PASSWORD = 'AuditPass!234567';
const USERS = {
  memberA: 'jjvv.audit.member.a@example.com',
  presidentA: 'jjvv.audit.president.a@example.com',
  memberB: 'jjvv.audit.member.b@example.com',
  secretaryB: 'jjvv.audit.secretary.b@example.com',
  outsider: 'jjvv.audit.outsider@example.com',
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

async function signup(email, password) {
  return request('/auth/v1/signup', {
    method: 'POST',
    body: { email, password },
  });
}

async function signIn(email, password) {
  return request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
}

async function ensureUser(email, password) {
  const login = await signIn(email, password);
  if (login.status === 200 && login.body?.access_token) {
    return {
      email,
      password,
      userId: login.body.user.id,
      token: login.body.access_token,
    };
  }

  const signupResponse = await signup(email, password);
  if (signupResponse.status !== 200 || !signupResponse.body?.access_token) {
    throw new Error(`Unable to provision ${email}: ${signupResponse.rawBody}`);
  }

  return {
    email,
    password,
    userId: signupResponse.body.user.id,
    token: signupResponse.body.access_token,
  };
}

async function getAccessibleOrganizations(token) {
  const rpcResponse = await request('/rest/v1/rpc/list_accessible_organizations', {
    method: 'GET',
    token,
  });

  if (rpcResponse.status === 200 && Array.isArray(rpcResponse.body)) {
    return rpcResponse.body;
  }

  if (rpcResponse.status !== 404) {
    throw new Error(`Unable to read accessible organizations: ${rpcResponse.rawBody}`);
  }

  const fallback = await request('/rest/v1/memberships?select=organization_id,role,organizations(name,logo_url,directiva_image_url)&is_active=eq.true', {
    token,
  });

  if (fallback.status !== 200 || !Array.isArray(fallback.body)) {
    throw new Error(`Unable to read accessible organizations via fallback: ${fallback.rawBody}`);
  }

  return fallback.body.map((item) => ({
    organization_id: item.organization_id,
    role: item.role,
    organization_name: Array.isArray(item.organizations) ? item.organizations[0]?.name ?? null : item.organizations?.name ?? null,
    organization_logo_url: Array.isArray(item.organizations) ? item.organizations[0]?.logo_url ?? null : item.organizations?.logo_url ?? null,
    organization_directiva_image_url: Array.isArray(item.organizations) ? item.organizations[0]?.directiva_image_url ?? null : item.organizations?.directiva_image_url ?? null,
  }));
}

function summarizeTest(report, { category, name, passed, evidence, note }) {
  report.tests.push({ category, name, passed, evidence, note });
}

async function provisionUsersOnly() {
  const users = {};
  for (const [label, email] of Object.entries(USERS)) {
    users[label] = await ensureUser(email, DEFAULT_PASSWORD);
  }

  console.log(JSON.stringify({
    message: 'Audit users provisioned. Run scripts/security/phase2_matrix_seed.sql in the Supabase SQL editor, then rerun this script without --provision-users.',
    users: Object.fromEntries(Object.entries(users).map(([label, user]) => [label, { email: user.email, userId: user.userId }])),
  }, null, 2));
}

async function runMatrix() {
  const report = {
    generatedAt: new Date().toISOString(),
    target: baseUrl,
    tests: [],
  };

  const users = {};
  for (const [label, email] of Object.entries(USERS)) {
    users[label] = await ensureUser(email, DEFAULT_PASSWORD);
  }

  const memberAOrgs = await getAccessibleOrganizations(users.memberA.token);
  const presidentAOrgs = await getAccessibleOrganizations(users.presidentA.token);
  const memberBOrgs = await getAccessibleOrganizations(users.memberB.token);
  const secretaryBOrgs = await getAccessibleOrganizations(users.secretaryB.token);
  const outsiderOrgs = await getAccessibleOrganizations(users.outsider.token);

  const orgA = presidentAOrgs.find((row) => row.organization_name === 'Security Audit JJVV A');
  const orgB = secretaryBOrgs.find((row) => row.organization_name === 'Security Audit JJVV B');

  if (!orgA || !orgB || memberAOrgs.length === 0 || memberBOrgs.length === 0) {
    throw new Error('Matrix fixture not found. Run scripts/security/phase2_matrix_seed.sql in Supabase SQL editor first.');
  }

  summarizeTest(report, {
    category: 'fixture',
    name: 'member-a-only-org-a',
    passed: memberAOrgs.length === 1 && memberAOrgs[0].organization_id === orgA.organization_id,
    evidence: memberAOrgs,
    note: 'Member A should only see organization A.',
  });

  summarizeTest(report, {
    category: 'fixture',
    name: 'outsider-sees-no-orgs',
    passed: outsiderOrgs.length === 0,
    evidence: outsiderOrgs,
    note: 'The outsider user should remain without memberships.',
  });

  const memberAReadsPresidentAProfile = await request(`/rest/v1/profiles?select=user_id,full_name,rut,phone,address&user_id=eq.${users.presidentA.userId}`, {
    token: users.memberA.token,
  });
  summarizeTest(report, {
    category: 'same-org-privacy',
    name: 'member-a-cannot-read-president-a-private-profile',
    passed: memberAReadsPresidentAProfile.status === 200
      && Array.isArray(memberAReadsPresidentAProfile.body)
      && memberAReadsPresidentAProfile.body.length === 0,
    evidence: memberAReadsPresidentAProfile,
    note: 'A member should not be able to read another neighbor profile fields such as phone, RUT or address.',
  });

  const createAnnouncementA = await request('/rest/v1/announcements', {
    method: 'POST',
    token: users.presidentA.token,
    body: {
      organization_id: orgA.organization_id,
      title: 'Matrix audit announcement A',
      body: 'Matrix audit announcement A',
      created_by: users.presidentA.userId,
    },
  });

  summarizeTest(report, {
    category: 'setup',
    name: 'president-a-create-announcement-a',
    passed: createAnnouncementA.status === 201,
    evidence: createAnnouncementA,
    note: 'President A should be able to create content in organization A.',
  });

  const createFinanceA = await request('/rest/v1/finance_entries', {
    method: 'POST',
    token: users.presidentA.token,
    body: {
      organization_id: orgA.organization_id,
      entry_type: 'expense',
      category: 'audit',
      amount_cents: 1500,
      entry_date: '2026-03-14',
      created_by: users.presidentA.userId,
    },
  });

  summarizeTest(report, {
    category: 'setup',
    name: 'president-a-create-finance-a',
    passed: createFinanceA.status === 201,
    evidence: createFinanceA,
    note: 'President A should be able to create finance entries in organization A.',
  });

  const memberAReadsOrgBAnnouncements = await request(`/rest/v1/announcements?select=id&organization_id=eq.${orgB.organization_id}`, {
    token: users.memberA.token,
  });
  summarizeTest(report, {
    category: 'cross-org-read',
    name: 'member-a-cannot-read-org-b-announcements',
    passed: memberAReadsOrgBAnnouncements.status === 200 && Array.isArray(memberAReadsOrgBAnnouncements.body) && memberAReadsOrgBAnnouncements.body.length === 0,
    evidence: memberAReadsOrgBAnnouncements,
    note: 'A member from org A must not read org B announcements.',
  });

  const outsiderReadsOrgAFinance = await request(`/rest/v1/finance_entries?select=id&organization_id=eq.${orgA.organization_id}`, {
    token: users.outsider.token,
  });
  summarizeTest(report, {
    category: 'outsider-read',
    name: 'outsider-cannot-read-org-a-finance',
    passed: outsiderReadsOrgAFinance.status === 200 && Array.isArray(outsiderReadsOrgAFinance.body) && outsiderReadsOrgAFinance.body.length === 0,
    evidence: outsiderReadsOrgAFinance,
    note: 'An authenticated outsider must not read finance entries from a JJVV.',
  });

  const outsiderCreatesAlertInOrgA = await request('/rest/v1/alerts', {
    method: 'POST',
    token: users.outsider.token,
    body: {
      organization_id: orgA.organization_id,
      created_by: users.outsider.userId,
      category: 'seguridad',
      message: 'matrix outsider alert',
    },
  });
  summarizeTest(report, {
    category: 'outsider-write',
    name: 'outsider-cannot-create-alert-org-a',
    passed: outsiderCreatesAlertInOrgA.status === 403,
    evidence: outsiderCreatesAlertInOrgA,
    note: 'An outsider must not create content in organization A.',
  });

  const secretaryBWritesMembershipOrgA = await request('/rest/v1/rpc/update_membership_role', {
    method: 'POST',
    token: users.secretaryB.token,
    body: {
      p_org_id: orgA.organization_id,
      p_user_id: users.memberA.userId,
      p_role: 'director',
    },
  });
  summarizeTest(report, {
    category: 'cross-org-admin',
    name: 'secretary-b-cannot-change-org-a-membership',
    passed: secretaryBWritesMembershipOrgA.status >= 400,
    evidence: secretaryBWritesMembershipOrgA,
    note: 'An admin from org B must not mutate memberships in org A.',
  });

  const presidentAWritesFinanceOrgB = await request('/rest/v1/finance_entries', {
    method: 'POST',
    token: users.presidentA.token,
    body: {
      organization_id: orgB.organization_id,
      entry_type: 'expense',
      category: 'audit',
      amount_cents: 1700,
      entry_date: '2026-03-14',
      created_by: users.presidentA.userId,
    },
  });
  summarizeTest(report, {
    category: 'cross-org-admin',
    name: 'president-a-cannot-write-finance-org-b',
    passed: presidentAWritesFinanceOrgB.status === 403,
    evidence: presidentAWritesFinanceOrgB,
    note: 'A president from org A must not write finance entries in org B.',
  });

  const memberACreatesTicket = await request('/rest/v1/rpc/create_ticket', {
    method: 'POST',
    token: users.memberA.token,
    body: {
      p_org_id: orgA.organization_id,
      p_title: 'Matrix member A ticket',
      p_description: 'Matrix member A ticket',
      p_category: 'general',
      p_attachment_path: null,
    },
  });
  summarizeTest(report, {
    category: 'setup',
    name: 'member-a-create-ticket-org-a',
    passed: memberACreatesTicket.status === 200,
    evidence: memberACreatesTicket,
    note: 'Member A should be able to create their own ticket in org A.',
  });

  const memberATicketId = memberACreatesTicket.body?.id ?? memberACreatesTicket.body?.[0]?.id ?? null;
  if (memberATicketId) {
    const secretaryBReadsTicketA = await request('/rest/v1/rpc/list_ticket_comments', {
      method: 'POST',
      token: users.secretaryB.token,
      body: {
        p_ticket_id: memberATicketId,
      },
    });
    summarizeTest(report, {
      category: 'cross-org-admin',
      name: 'secretary-b-cannot-read-org-a-ticket-comments',
      passed: secretaryBReadsTicketA.status === 200 && Array.isArray(secretaryBReadsTicketA.body) && secretaryBReadsTicketA.body.length === 0,
      evidence: secretaryBReadsTicketA,
      note: 'An admin from org B must not read ticket discussions from org A.',
    });
  }

  if (env.SECURITY_SUPERADMIN_PASSWORD) {
    const superadmin = await signIn(env.SECURITY_SUPERADMIN_EMAIL || 'javier.aravena25@gmail.com', env.SECURITY_SUPERADMIN_PASSWORD);
    const superadminOrgs = await getAccessibleOrganizations(superadmin.body.access_token);
    summarizeTest(report, {
      category: 'superadmin',
      name: 'superadmin-sees-both-orgs',
      passed: superadminOrgs.some((row) => row.organization_id === orgA.organization_id) && superadminOrgs.some((row) => row.organization_id === orgB.organization_id),
      evidence: superadminOrgs,
      note: 'The reserved global superadmin should see organizations A and B.',
    });
  }

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
      status: test.evidence.status,
      body: test.evidence.body,
    })),
  }, null, 2));

  process.exitCode = failed.length > 0 ? 1 : 0;
}

if (process.argv.includes('--provision-users')) {
  await provisionUsersOnly();
} else {
  await runMatrix();
}
