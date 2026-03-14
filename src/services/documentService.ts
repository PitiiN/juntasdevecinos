import { supabase } from '../lib/supabase';

export type DocumentFolder = 'Actas' | 'Documentos relativos' | 'Documentos contables' | 'General';

export type CommunityDocument = {
    id: string;
    organization_id: string;
    title: string;
    doc_type: string;
    file_path: string;
    description: string | null;
    created_by: string;
    created_at: string;
    is_public: boolean;
    folder: DocumentFolder;
    original_file_name: string | null;
    mime_type: string | null;
    file_size_bytes: number | null;
};

const bucketName = 'jjvv-documents';

const sanitizeFileName = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase();

export const documentService = {
    async getDocuments(organizationId: string): Promise<CommunityDocument[]> {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as CommunityDocument[];
    },

    async createDocument(docData: Omit<CommunityDocument, 'id' | 'created_at'>) {
        const { data, error } = await supabase
            .from('documents')
            .insert(docData)
            .select()
            .single();

        if (error) throw error;
        return data as CommunityDocument;
    },

    async deleteDocument(id: string, filePath?: string) {
        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id);

        if (error) throw error;

        if (filePath) {
            await supabase.storage.from(bucketName).remove([filePath]);
        }
    },

    async uploadDocument(params: {
        organizationId: string;
        folder: DocumentFolder;
        fileName: string;
        fileUri: string;
        mimeType?: string | null;
    }) {
        const folderSlug = sanitizeFileName(params.folder);
        const safeName = sanitizeFileName(params.fileName);
        const filePath = `${params.organizationId}/${folderSlug}/${Date.now()}-${safeName}`;
        const response = await fetch(params.fileUri);
        const arrayBuffer = await response.arrayBuffer();

        const { error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, arrayBuffer, {
                contentType: params.mimeType || undefined,
                upsert: false,
            });

        if (error) throw error;
        return filePath;
    },

    async getSignedUrl(filePath: string) {
        const { data, error } = await supabase
            .storage
            .from(bucketName)
            .createSignedUrl(filePath, 3600);

        if (error) throw error;
        return data?.signedUrl || null;
    }
};
