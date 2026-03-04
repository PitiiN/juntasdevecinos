import { supabase } from '../lib/supabase';

export const eventService = {
    // Get current and future events
    async getEvents(organizationId: string) {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .eq('organization_id', organizationId)
            .gte('starts_at', now) // Only future or ongoing events
            .order('starts_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // Get user's event registrations
    async getMyRegistrations(userId: string) {
        const { data, error } = await supabase
            .from('event_registrations')
            .select('event_id')
            .eq('user_id', userId);

        if (error) throw error;
        return data?.map(r => r.event_id) || [];
    },

    // Register for an event
    async registerForEvent(eventId: string, userId: string) {
        const { error } = await supabase
            .from('event_registrations')
            .insert({ event_id: eventId, user_id: userId });

        if (error) throw error;
    },

    // Unregister from an event
    async unregisterFromEvent(eventId: string, userId: string) {
        const { error } = await supabase
            .from('event_registrations')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', userId);

        if (error) throw error;
    },

    // Create an event (Admin)
    async createEvent(eventData: any) {
        const { data, error } = await supabase
            .from('events')
            .insert(eventData)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};
