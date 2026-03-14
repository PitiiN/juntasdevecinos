import { supabase } from '../lib/supabase';
import { Favor } from '../lib/store';

export const favorService = {
    async getFavors(organizationId: string): Promise<Favor[]> {
        const { data, error } = await supabase
            .from('favors')
            .select('*, favor_replies(*)')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Map DB fields to Store Favor type
        return (data || []).map(f => ({
            id: f.id,
            title: f.title,
            description: f.description,
            author: f.author_name,
            userEmail: f.user_email,
            date: new Date(f.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }),
            createdAt: new Date(f.created_at).getTime(),
            resolved: f.resolved,
            replies: (f.favor_replies || []).map((r: any) => ({
                id: r.id,
                message: r.message,
                author: r.author_name,
                date: new Date(r.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }),
                user_id: r.user_id
            }))
        }));
    },

    async createFavor(favor: Omit<Favor, 'id' | 'date' | 'createdAt' | 'resolved'> & { organization_id: string, user_id: string }) {
        const { data, error } = await supabase
            .from('favors')
            .insert({
                organization_id: favor.organization_id,
                user_id: favor.user_id,
                title: favor.title,
                description: favor.description,
                author_name: favor.author,
                user_email: favor.userEmail
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async updateFavor(id: string, updates: Partial<Favor>) {
        const dbUpdates: any = {};
        if (updates.title !== undefined) dbUpdates.title = updates.title;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.resolved !== undefined) dbUpdates.resolved = updates.resolved;
        dbUpdates.updated_at = new Date().toISOString();

        const { error } = await supabase
            .from('favors')
            .update(dbUpdates)
            .eq('id', id);

        if (error) throw error;
    },

    async deleteFavor(id: string) {
        const { error } = await supabase
            .from('favors')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async createReply(favorId: string, reply: { message: string, author: string, user_id: string }) {
        const { error } = await supabase
            .from('favor_replies')
            .insert({
                favor_id: favorId,
                message: reply.message,
                author_name: reply.author,
                user_id: reply.user_id
            });

        if (error) throw error;
    },

    subscribeToFavors(organizationId: string, onUpdate: () => void) {
        return supabase
            .channel(`favors:${organizationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'favors',
                    filter: `organization_id=eq.${organizationId}`
                },
                () => {
                    onUpdate();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'favor_replies'
                },
                () => {
                    onUpdate();
                }
            )
            .subscribe();
    }
};
