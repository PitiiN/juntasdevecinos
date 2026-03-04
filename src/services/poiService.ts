import { supabase } from '../lib/supabase';

export const poiService = {
    // Get POIs for an organization
    async getPois(organizationId: string) {
        const { data, error } = await supabase
            .from('pois')
            .select('*')
            .eq('organization_id', organizationId)
            .order('category', { ascending: true })
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // Create POI (Admin)
    async createPoi(poiData: any) {
        const { data, error } = await supabase
            .from('pois')
            .insert(poiData)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update POI (Admin)
    async updatePoi(id: string, poiData: any) {
        const { error } = await supabase
            .from('pois')
            .update(poiData)
            .eq('id', id);

        if (error) throw error;
    },

    // Delete POI (Admin)
    async deletePoi(id: string) {
        const { error } = await supabase
            .from('pois')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
