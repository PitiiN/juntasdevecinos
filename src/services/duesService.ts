import { supabase } from '../lib/supabase';

export type DueViewStatus = 'paid' | 'pending' | 'overdue' | 'PENDING_VALIDATION' | 'REJECTED';

type DueLedgerRow = {
    id: string;
    organization_id: string;
    user_id: string;
    status: 'due' | 'paid';
    review_status: 'none' | 'pending' | 'approved' | 'rejected';
    paid_at: string | null;
    proof_path: string | null;
    rejection_reason: string | null;
    rejection_comment: string | null;
    period: {
        year: number;
        month: number;
        amount_cents: number;
    } | {
        year: number;
        month: number;
        amount_cents: number;
    }[] | null;
};

export type DueItem = {
    id: string;
    organizationId: string;
    memberId: string;
    memberName: string;
    month: number;
    year: number;
    amount: number;
    status: DueViewStatus;
    paidDate?: string;
    proofPath?: string | null;
    proofUrl?: string | null;
    rejectionReason?: string | null;
    rejectionComment?: string | null;
    voucherId?: string;
};

const bucketName = 'jjvv-dues-proofs';

const sanitizeFileName = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

const isOverdue = (year: number, month: number) => {
    const dueDate = new Date(year, month, 0, 23, 59, 59, 999);
    return Date.now() > dueDate.getTime();
};

const buildVoucherId = (item: Pick<DueItem, 'year' | 'month' | 'memberId'>) => {
    const suffix = item.memberId.replace(/-/g, '').slice(-4).toUpperCase();
    return `V-${item.year}-${String(item.month).padStart(2, '0')}-${suffix}`;
};

const mapDueRow = async (row: DueLedgerRow, memberName?: string): Promise<DueItem> => {
    const period = Array.isArray(row.period) ? row.period[0] : row.period;
    const year = period?.year || new Date().getFullYear();
    const month = period?.month || 1;
    const amount = Math.round((period?.amount_cents || 0) / 100);
    let proofUrl: string | null = null;

    if (row.proof_path) {
        const { data, error } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(row.proof_path, 3600);

        if (!error) {
            proofUrl = data?.signedUrl || null;
        }
    }

    let status: DueViewStatus;
    if (row.status === 'paid') {
        status = 'paid';
    } else if (row.review_status === 'rejected') {
        status = 'REJECTED';
    } else if (row.review_status === 'pending' || row.proof_path) {
        status = 'PENDING_VALIDATION';
    } else if (isOverdue(year, month)) {
        status = 'overdue';
    } else {
        status = 'pending';
    }

    return {
        id: row.id,
        organizationId: row.organization_id,
        memberId: row.user_id,
        memberName: memberName || 'Vecino',
        month,
        year,
        amount,
        status,
        paidDate: row.paid_at ? new Date(row.paid_at).toLocaleDateString('es-CL') : undefined,
        proofPath: row.proof_path,
        proofUrl,
        rejectionReason: row.rejection_reason,
        rejectionComment: row.rejection_comment,
        voucherId: row.status === 'paid' ? buildVoucherId({ year, month, memberId: row.user_id }) : undefined,
    };
};

export const duesService = {
    async getMyDues(organizationId: string, userId: string) {
        const { data, error } = await supabase
            .from('dues_ledger')
            .select(`
                id,
                organization_id,
                user_id,
                status,
                review_status,
                paid_at,
                proof_path,
                rejection_reason,
                rejection_comment,
                period:period_id (
                    year,
                    month,
                    amount_cents
                )
            `)
            .eq('organization_id', organizationId)
            .eq('user_id', userId);

        if (error) {
            throw error;
        }

        return Promise.all(
            ((data || []) as unknown as DueLedgerRow[]).map((row) => mapDueRow(row))
        );
    },

    async getOrganizationDues(organizationId: string, memberDirectory: Record<string, { name: string }>) {
        const { data, error } = await supabase.rpc('list_organization_dues', {
            p_org_id: organizationId,
        });

        if (error) {
            throw error;
        }

        return Promise.all(
            ((data || []) as Array<{
                ledger_id: string;
                user_id: string;
                year: number;
                month: number;
                amount_cents: number;
                status: 'due' | 'paid';
                review_status: 'none' | 'pending' | 'approved' | 'rejected';
                paid_at: string | null;
                proof_path: string | null;
                rejection_reason: string | null;
                rejection_comment: string | null;
                full_name: string | null;
            }>).map((row) => mapDueRow({
                id: row.ledger_id,
                organization_id: organizationId,
                user_id: row.user_id,
                status: row.status,
                review_status: row.review_status,
                paid_at: row.paid_at,
                proof_path: row.proof_path,
                rejection_reason: row.rejection_reason,
                rejection_comment: row.rejection_comment,
                period: {
                    year: row.year,
                    month: row.month,
                    amount_cents: row.amount_cents,
                },
            }, row.full_name || memberDirectory[row.user_id]?.name))
        );
    },

    async uploadProof(params: {
        organizationId: string;
        userId: string;
        ledgerId: string;
        fileName: string;
        fileUri: string;
        mimeType?: string | null;
    }) {
        const safeFileName = sanitizeFileName(params.fileName || `proof-${Date.now()}`);
        const filePath = `${params.organizationId}/${params.userId}/${params.ledgerId}/${Date.now()}-${safeFileName}`;
        const response = await fetch(params.fileUri);
        const arrayBuffer = await response.arrayBuffer();

        const { error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, arrayBuffer, {
                contentType: params.mimeType || undefined,
                upsert: false,
            });

        if (error) {
            throw error;
        }

        return filePath;
    },

    async submitProof(ledgerId: string, proofPath: string) {
        const { error } = await supabase
            .from('dues_ledger')
            .update({
                proof_path: proofPath,
                review_status: 'pending',
                rejection_reason: null,
                rejection_comment: null,
            })
            .eq('id', ledgerId);

        if (error) {
            throw error;
        }
    },

    async approveDue(ledgerId: string) {
        const { error } = await supabase.rpc('approve_due_payment', {
            p_ledger_id: ledgerId,
        });

        if (error) {
            throw error;
        }
    },

    async rejectDue(ledgerId: string, reason: string, comment?: string) {
        const { error } = await supabase.rpc('reject_due_payment', {
            p_ledger_id: ledgerId,
            p_reason: reason,
            p_comment: comment || null,
        });

        if (error) {
            throw error;
        }
    },

    async setDueStatus(ledgerId: string, status: 'due' | 'paid') {
        const { error } = await supabase.rpc('set_due_status_admin', {
            p_ledger_id: ledgerId,
            p_status: status,
        });

        if (error) {
            throw error;
        }
    },
};
