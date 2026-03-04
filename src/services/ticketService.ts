import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

export const ticketService = {
    // Get user's own tickets
    async getMyTickets(organizationId: string, userId: string) {
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('created_by', userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Get all tickets for an organization (Admin)
    async getAllTickets(organizationId: string) {
        const { data, error } = await supabase
            .from('tickets')
            .select(`
        *,
        profiles:created_by (full_name)
      `)
            .eq('organization_id', organizationId)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Create a new ticket
    async createTicket(ticketData: any) {
        const { data, error } = await supabase
            .from('tickets')
            .insert(ticketData)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Update ticket status (Admin)
    async updateTicketStatus(id: string, status: 'open' | 'in_progress' | 'resolved' | 'rejected') {
        const { error } = await supabase
            .from('tickets')
            .update({ status })
            .eq('id', id);

        if (error) throw error;
    },

    // Get comments for a ticket
    async getTicketComments(ticketId: string) {
        const { data, error } = await supabase
            .from('ticket_comments')
            .select(`
        *,
        profiles:author_id (full_name, avatar_url)
      `)
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // Add a comment to a ticket
    async addComment(ticketId: string, authorId: string, body: string) {
        const { error } = await supabase
            .from('ticket_comments')
            .insert({ ticket_id: ticketId, author_id: authorId, body });

        if (error) throw error;
    }
};
