import { supabase } from '../lib/supabase';

export const duesService = {
    // Get user's dues history
    async getMyDues(organizationId: string, userId: string) {
        const { data, error } = await supabase
            .from('dues_ledger')
            .select(`
        *,
        period:period_id (year, month, amount_cents)
      `)
            .eq('organization_id', organizationId)
            .eq('user_id', userId)
            .order('period(year)', { ascending: false })
            .order('period(month)', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Get all dues periods for an organization
    async getDuesPeriods(organizationId: string) {
        const { data, error } = await supabase
            .from('dues_periods')
            .select('*')
            .eq('organization_id', organizationId)
            .order('year', { ascending: false })
            .order('month', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Upload proof of payment
    // Note: Actual file upload to storage happens before calling this
    async updateProofOfPayment(ledgerId: string, proofPath: string) {
        const { error } = await supabase
            .from('dues_ledger')
            .update({ proof_path: proofPath, status: 'paid', paid_at: new Date().toISOString() })
            .eq('id', ledgerId);

        if (error) throw error;
    },

    // Mark ledger entry as paid/due (Admin)
    async updateDuesStatus(ledgerId: string, status: 'paid' | 'due') {
        const { error } = await supabase
            .from('dues_ledger')
            .update({
                status,
                paid_at: status === 'paid' ? new Date().toISOString() : null
            })
            .eq('id', ledgerId);

        if (error) throw error;
    }
};
