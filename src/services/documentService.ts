import { supabase } from '../lib/supabase';

export const documentService = {
    // Get all documents for an organization
    async getDocuments(organizationId: string) {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // Create document entry
    async createDocument(docData: any) {
        const { data, error } = await supabase
            .from('documents')
            .insert(docData)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Delete document entry
    async deleteDocument(id: string) {
        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Generate signed URL for downloading a file
    async getSignedUrl(bucketName: string, filePath: string) {
        const { data, error } = await supabase
            .storage
            .from(bucketName)
            .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (error) throw error;
        return data?.signedUrl;
    }
};
