import { supabase } from '../lib/supabase';

export type ReplyMediaType = 'image' | 'video' | 'audio';

export type AnnouncementReply = {
    id: string;
    author_name: string;
    body: string;
    media_type: ReplyMediaType | null;
    media_path: string | null;
    media_url: string | null;
    created_at: string;
};

export type CommunityAnnouncement = {
    id: string;
    organization_id: string;
    title: string;
    body: string;
    priority: 'normal' | 'important';
    published_at: string;
    is_deleted: boolean;
    location: string | null;
    schedule: string | null;
    expires_at: string | null;
    announcement_replies?: AnnouncementReply[];
};

type AnnouncementReplyRow = {
    id: string;
    author_name: string;
    body: string;
    media_type: ReplyMediaType | null;
    media_path: string | null;
    created_at: string;
};

const replyBucketName = 'jjvv-announcement-replies';

const sanitizeFileName = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

const resolveSignedReplyUrl = async (filePath: string | null) => {
    if (!filePath) {
        return null;
    }

    const { data, error } = await supabase.storage
        .from(replyBucketName)
        .createSignedUrl(filePath, 3600);

    if (error) {
        return null;
    }

    return data?.signedUrl || null;
};

const mapReply = async (reply: AnnouncementReplyRow): Promise<AnnouncementReply> => ({
    ...reply,
    media_url: await resolveSignedReplyUrl(reply.media_path),
});

export const announcementService = {
    async getAnnouncements(organizationId: string): Promise<CommunityAnnouncement[]> {
        const { data, error } = await supabase
            .from('announcements')
            .select(`
                id,
                organization_id,
                title,
                body,
                priority,
                published_at,
                is_deleted,
                location,
                schedule,
                expires_at,
                announcement_replies (
                    id,
                    author_name,
                    body,
                    media_type,
                    media_path,
                    created_at
                )
            `)
            .eq('organization_id', organizationId)
            .eq('is_deleted', false)
            .order('priority', { ascending: false })
            .order('published_at', { ascending: false });

        if (error) {
            throw error;
        }

        const announcements = (data || []) as Array<Omit<CommunityAnnouncement, 'announcement_replies'> & {
            announcement_replies?: AnnouncementReplyRow[];
        }>;

        return Promise.all(
            announcements.map(async (announcement) => ({
                ...announcement,
                announcement_replies: await Promise.all(
                    [...(announcement.announcement_replies || [])]
                        .sort((left, right) => (
                            new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
                        ))
                        .map(mapReply)
                ),
            }))
        );
    },

    async createAnnouncement(announcement: {
        organization_id: string;
        title: string;
        body: string;
        priority?: 'normal' | 'important';
        created_by: string;
        location?: string | null;
        schedule?: string | null;
        expires_at?: string | null;
    }) {
        const { data, error } = await supabase
            .from('announcements')
            .insert(announcement)
            .select(`
                id,
                organization_id,
                title,
                body,
                priority,
                published_at,
                is_deleted,
                location,
                schedule,
                expires_at
            `)
            .single();

        if (error) {
            throw error;
        }

        return data as CommunityAnnouncement;
    },

    async updateAnnouncement(
        id: string,
        updates: {
            title?: string;
            body?: string;
            priority?: 'normal' | 'important';
            location?: string | null;
            schedule?: string | null;
            expires_at?: string | null;
        }
    ) {
        const { error } = await supabase
            .from('announcements')
            .update(updates)
            .eq('id', id);

        if (error) {
            throw error;
        }
    },

    async deleteAnnouncement(id: string) {
        const { error } = await supabase
            .from('announcements')
            .update({ is_deleted: true })
            .eq('id', id);

        if (error) {
            throw error;
        }
    },

    async addReply(params: {
        announcement_id: string;
        author_id: string;
        author_name: string;
        body: string;
        media_type?: ReplyMediaType | null;
        media_path?: string | null;
    }) {
        const { error } = await supabase
            .from('announcement_replies')
            .insert({
                announcement_id: params.announcement_id,
                author_id: params.author_id,
                author_name: params.author_name,
                body: params.body,
                media_type: params.media_type ?? null,
                media_path: params.media_path ?? null,
            });

        if (error) {
            throw error;
        }
    },

    async uploadReplyMedia(params: {
        organizationId: string;
        announcementId: string;
        userId: string;
        fileName: string;
        fileUri: string;
        mimeType?: string | null;
    }) {
        const safeFileName = sanitizeFileName(params.fileName || `reply-${Date.now()}`);
        const filePath = `${params.organizationId}/${params.userId}/${params.announcementId}/${Date.now()}-${safeFileName}`;
        const response = await fetch(params.fileUri);
        const arrayBuffer = await response.arrayBuffer();

        const { error } = await supabase.storage
            .from(replyBucketName)
            .upload(filePath, arrayBuffer, {
                contentType: params.mimeType || undefined,
                upsert: false,
            });

        if (error) {
            throw error;
        }

        return filePath;
    },
};
