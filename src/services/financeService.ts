import { supabase } from '../lib/supabase';

export const financeService = {
    // Get finance entries for an organization
    async getFinances(organizationId: string) {
        const { data, error } = await supabase
            .from('finance_entries')
            .select('*')
            .eq('organization_id', organizationId)
            .order('entry_date', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Create a finance entry (Treasurer)
    async createEntry(entryData: any) {
        const { data, error } = await supabase
            .from('finance_entries')
            .insert(entryData)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Approve a finance entry (President)
    async approveEntry(id: string, approverId: string, status: 'approved' | 'rejected') {
        const { error } = await supabase
            .from('finance_entries')
            .update({
                approval_status: status,
                approved_by: approverId,
                approved_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
    }
};
