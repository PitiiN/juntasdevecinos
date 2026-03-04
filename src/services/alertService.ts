import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

export const alertService = {
    // Get published alerts for an organization
    async getAlerts(organizationId: string) {
        const { data, error } = await supabase
            .from('alerts')
            .select(`
        *,
        profiles:created_by (full_name)
      `)
            .eq('organization_id', organizationId)
            .eq('status', 'published')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Create a new alert
    async createAlert(alertData: {
        organization_id: string;
        created_by: string;
        category: string;
        message: string;
        photo_path?: string | null;
        location?: any;
    }) {
        const { data, error } = await supabase
            .from('alerts')
            .insert(alertData)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update alert status (Admin/Moderator)
    async updateAlertStatus(id: string, status: 'pending' | 'published' | 'discarded') {
        const { error } = await supabase
            .from('alerts')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
    }
};
