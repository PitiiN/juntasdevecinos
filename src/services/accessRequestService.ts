import { supabase } from '../lib/supabase';
import { isInternalAuditOrganization } from '../lib/constants';

export type JoinableOrganization = {
    id: string;
    name: string;
    region: string | null;
    commune: string | null;
};

export type MembershipRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type MembershipRequestInfo = {
    id: string;
    organizationId: string;
    organizationName: string;
    requestedEmail: string;
    requestedFullName: string | null;
    status: MembershipRequestStatus;
    rejectionReason: string | null;
    createdAt: string;
    reviewedAt: string | null;
};

export type OrganizationMembershipRequest = {
    id: string;
    userId: string;
    requestedEmail: string;
    requestedFullName: string | null;
    status: MembershipRequestStatus;
    rejectionReason: string | null;
    createdAt: string;
    reviewedAt: string | null;
};

const mapRequest = (row: any): MembershipRequestInfo => ({
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name || 'Organizacion',
    requestedEmail: row.requested_email || '',
    requestedFullName: row.requested_full_name || null,
    status: row.status,
    rejectionReason: row.rejection_reason || null,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || null,
});

export const accessRequestService = {
    async listJoinableOrganizations(): Promise<JoinableOrganization[]> {
        const { data, error } = await supabase.rpc('list_joinable_organizations');
        if (error) throw error;
        return ((data || []) as JoinableOrganization[])
            .filter((organization) => !isInternalAuditOrganization(organization.name))
            .sort((left, right) => left.name.localeCompare(right.name, 'es'));
    },

    async getMyMembershipRequest(): Promise<MembershipRequestInfo | null> {
        const { data, error } = await supabase.rpc('get_my_membership_request');
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : null;
        if (!row || isInternalAuditOrganization(row.organization_name)) {
            return null;
        }
        return mapRequest(row);
    },

    async requestMembership(organizationId: string): Promise<MembershipRequestInfo> {
        const { data, error } = await supabase.rpc('request_membership', {
            p_org_id: organizationId,
        });

        if (error) throw error;

        const requestId = Array.isArray(data) ? data[0]?.id : data?.id;
        if (!requestId) {
            throw new Error('No se pudo registrar la solicitud');
        }

        const current = await this.getMyMembershipRequest();
        if (!current) {
            throw new Error('La solicitud fue creada pero no pudo cargarse');
        }

        return current;
    },

    async listOrganizationMembershipRequests(organizationId: string): Promise<OrganizationMembershipRequest[]> {
        const { data, error } = await supabase.rpc('list_organization_membership_requests', {
            p_org_id: organizationId,
        });

        if (error) throw error;

        return ((data || []) as any[]).map((row) => ({
            id: row.id,
            userId: row.user_id,
            requestedEmail: row.requested_email || '',
            requestedFullName: row.requested_full_name || null,
            status: row.status,
            rejectionReason: row.rejection_reason || null,
            createdAt: row.created_at,
            reviewedAt: row.reviewed_at || null,
        }));
    },

    async approveMembershipRequest(requestId: string) {
        const { error } = await supabase.rpc('approve_membership_request', {
            p_request_id: requestId,
        });

        if (error) throw error;
    },

    async rejectMembershipRequest(requestId: string, reason?: string | null) {
        const { error } = await supabase.rpc('reject_membership_request', {
            p_request_id: requestId,
            p_reason: reason || null,
        });

        if (error) throw error;
    },
};
