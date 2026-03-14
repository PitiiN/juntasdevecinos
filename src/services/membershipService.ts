import { supabase } from '../lib/supabase';
import { Role } from '../lib/constants';

export type OrganizationMember = {
    user_id: string;
    full_name: string | null;
    email: string | null;
    role: Role;
    is_active: boolean;
    joined_at: string;
};

export const membershipService = {
    async listOrganizationMembers(organizationId: string): Promise<OrganizationMember[]> {
        const { data, error } = await supabase.rpc('list_organization_members', {
            p_org_id: organizationId,
        });

        if (error) throw error;
        return (data || []) as OrganizationMember[];
    },

    async updateRole(organizationId: string, userId: string, role: Role) {
        const { error } = await supabase.rpc('update_membership_role', {
            p_org_id: organizationId,
            p_user_id: userId,
            p_role: role,
        });

        if (error) throw error;
    },

    async setActiveStatus(organizationId: string, userId: string, isActive: boolean) {
        const { error } = await supabase.rpc('set_membership_active', {
            p_org_id: organizationId,
            p_user_id: userId,
            p_is_active: isActive,
        });

        if (error) throw error;
    },
};
