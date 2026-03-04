import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Announcement = Database['public']['Tables']['announcements']['Row'];

export const announcementService = {
    // Get active announcements for an organization
    async getAnnouncements(organizationId: string): Promise<Announcement[]> {
        const { data, error } = await supabase
            .from('announcements')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_deleted', false)
            .order('priority', { ascending: false }) // Important first
            .order('published_at', { ascending: false }); // Then newest

        if (error) throw error;
        return data || [];
    },

    // Create a new announcement (Admin)
    async createAnnouncement(announcement: Omit<Announcement, 'id' | 'published_at' | 'is_deleted'>): Promise<Announcement> {
        const { data, error } = await supabase
            .from('announcements')
            .insert(announcement)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Soft delete announcement (Admin)
    async deleteAnnouncement(id: string): Promise<void> {
        const { error } = await supabase
            .from('announcements')
            .update({ is_deleted: true })
            .eq('id', id);

        if (error) throw error;
    }
};
