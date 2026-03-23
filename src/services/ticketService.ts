import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import * as FileSystem from 'expo-file-system/legacy';

type TicketStatus = Database['public']['Enums']['ticket_status_t'];
type TicketViewer = 'user' | 'admin';
type TicketCommentKind = 'user' | 'admin';

type TicketRow = {
    id: string;
    organization_id: string;
    created_by: string;
    reporter_name: string | null;
    reporter_email: string | null;
    title: string;
    description: string;
    category: string;
    status: TicketStatus;
    tracking_code: string | null;
    attachment_path: string | null;
    created_at: string;
    updated_at: string;
    last_user_viewed_at: string | null;
    last_admin_viewed_at: string | null;
    reply_count: number;
};

type TicketCommentRow = {
    id: string;
    ticket_id: string;
    author_id: string;
    author_name: string | null;
    author_kind: TicketCommentKind;
    body: string;
    created_at: string;
};

export type TicketViewStatus = 'Abierta' | 'En proceso' | 'Resuelta' | 'Rechazada';

export type TicketItem = {
    id: string;
    organizationId: string;
    createdBy: string;
    reporterName: string;
    reporterEmail: string;
    title: string;
    description: string;
    category: string;
    status: TicketViewStatus;
    rawStatus: TicketStatus;
    trackingCode: string;
    attachmentPath: string | null;
    attachmentUrl: string | null;
    createdAt: string;
    updatedAt: string;
    createdDateLabel: string;
    updatedDateLabel: string;
    replyCount: number;
    isUnreadForUser: boolean;
    isUnreadForAdmin: boolean;
};

export type TicketComment = {
    id: string;
    ticketId: string;
    authorId: string;
    authorName: string;
    from: TicketCommentKind;
    body: string;
    createdAt: string;
    createdDateLabel: string;
};

export type TicketCounters = {
    myUnreadCount: number;
    adminUnreadCount: number;
    openCount: number;
};

const TICKET_ATTACHMENTS_BUCKET = 'jjvv-ticket-attachments';

const STATUS_LABELS: Record<TicketStatus, TicketViewStatus> = {
    open: 'Abierta',
    in_progress: 'En proceso',
    resolved: 'Resuelta',
    rejected: 'Rechazada',
};

const sanitizeFileName = (value: string) =>
    value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

const getFileExtension = (fileName: string) => {
    const parts = fileName.split('.');
    if (parts.length < 2) {
        return '';
    }
    const ext = parts[parts.length - 1].trim().toLowerCase();
    if (!ext) {
        return '';
    }
    return `.${ext.replace(/[^a-z0-9]/g, '')}`;
};

const ensureReadableUploadUri = async (fileUri: string, fileName: string) => {
    if (!fileUri.startsWith('content://') || !FileSystem.cacheDirectory) {
        return {
            readableUri: fileUri,
            cleanup: async () => { },
        };
    }

    const extension = getFileExtension(fileName);
    const tempUri = `${FileSystem.cacheDirectory}ticket-attachment-${Date.now()}${extension}`;

    await FileSystem.copyAsync({
        from: fileUri,
        to: tempUri,
    });

    return {
        readableUri: tempUri,
        cleanup: async () => {
            try {
                await FileSystem.deleteAsync(tempUri, { idempotent: true });
            } catch {
                // Best effort cleanup.
            }
        },
    };
};

const formatDateLabel = (value: string) =>
    new Date(value).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

const resolveAttachmentUrl = async (attachmentPath: string | null) => {
    if (!attachmentPath) {
        return null;
    }

    const { data, error } = await supabase.storage
        .from(TICKET_ATTACHMENTS_BUCKET)
        .createSignedUrl(attachmentPath, 3600);

    if (error) {
        return null;
    }

    return data?.signedUrl || null;
};

const mapTicketRow = async (row: TicketRow): Promise<TicketItem> => {
    const attachmentUrl = await resolveAttachmentUrl(row.attachment_path);

    return {
        id: row.id,
        organizationId: row.organization_id,
        createdBy: row.created_by,
        reporterName: row.reporter_name || 'Vecino',
        reporterEmail: row.reporter_email || '',
        title: row.title,
        description: row.description || '',
        category: row.category,
        status: STATUS_LABELS[row.status],
        rawStatus: row.status,
        trackingCode: row.tracking_code || row.id.slice(0, 8).toUpperCase(),
        attachmentPath: row.attachment_path,
        attachmentUrl,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdDateLabel: formatDateLabel(row.created_at),
        updatedDateLabel: formatDateLabel(row.updated_at),
        replyCount: Number(row.reply_count || 0),
        isUnreadForUser: new Date(row.updated_at).getTime() > new Date(row.last_user_viewed_at || 0).getTime(),
        isUnreadForAdmin: new Date(row.updated_at).getTime() > new Date(row.last_admin_viewed_at || 0).getTime(),
    };
};

const mapCommentRow = (row: TicketCommentRow): TicketComment => ({
    id: row.id,
    ticketId: row.ticket_id,
    authorId: row.author_id,
    authorName: row.author_name || 'Usuario',
    from: row.author_kind,
    body: row.body,
    createdAt: row.created_at,
    createdDateLabel: formatDateLabel(row.created_at),
});

const uploadAttachment = async (params: {
    organizationId: string;
    userId: string;
    fileUri: string;
    fileName: string;
    mimeType?: string | null;
}) => {
    const safeFileName = sanitizeFileName(params.fileName || `ticket-${Date.now()}.jpg`);
    const filePath = `${params.organizationId}/${params.userId}/${Date.now()}-${safeFileName}`;
    const { readableUri, cleanup } = await ensureReadableUploadUri(params.fileUri, safeFileName);

    try {
        const response = await fetch(readableUri);
        if (!response.ok) {
            throw new Error('No se pudo leer el archivo adjunto.');
        }
        const arrayBuffer = await response.arrayBuffer();

        const { error } = await supabase.storage
            .from(TICKET_ATTACHMENTS_BUCKET)
            .upload(filePath, arrayBuffer, {
                contentType: params.mimeType || undefined,
                upsert: false,
            });

        if (error) {
            throw error;
        }

        return filePath;
    } catch (error: any) {
        const message = String(error?.message || '').toLowerCase();
        if (message.includes('network request failed')) {
            throw new Error('No se pudo procesar la imagen adjunta. Intenta seleccionarla nuevamente.');
        }
        throw error;
    } finally {
        await cleanup();
    }
};

export const ticketService = {
    async getMyTickets(organizationId: string) {
        const { data, error } = await supabase.rpc('list_my_tickets', {
            p_org_id: organizationId,
        });

        if (error) {
            throw error;
        }

        return Promise.all(((data || []) as TicketRow[]).map((row) => mapTicketRow(row)));
    },

    async getOrganizationTickets(organizationId: string) {
        const { data, error } = await supabase.rpc('list_organization_tickets', {
            p_org_id: organizationId,
        });

        if (error) {
            throw error;
        }

        return Promise.all(((data || []) as TicketRow[]).map((row) => mapTicketRow(row)));
    },

    async getTicketComments(ticketId: string) {
        const { data, error } = await supabase.rpc('list_ticket_comments', {
            p_ticket_id: ticketId,
        });

        if (error) {
            throw error;
        }

        return ((data || []) as TicketCommentRow[]).map(mapCommentRow);
    },

    async getTicketById(ticketId: string, organizationId: string, scope: TicketViewer) {
        const tickets = scope === 'admin'
            ? await this.getOrganizationTickets(organizationId)
            : await this.getMyTickets(organizationId);

        return tickets.find((ticket) => ticket.id === ticketId) || null;
    },

    async getCounters(organizationId: string): Promise<TicketCounters> {
        const { data, error } = await supabase.rpc('get_ticket_counters', {
            p_org_id: organizationId,
        });

        if (error) {
            throw error;
        }

        const row = ((data || []) as Array<{
            my_unread_count: number;
            admin_unread_count: number;
            open_count: number;
        }>)[0];

        return {
            myUnreadCount: Number(row?.my_unread_count || 0),
            adminUnreadCount: Number(row?.admin_unread_count || 0),
            openCount: Number(row?.open_count || 0),
        };
    },

    async createTicket(params: {
        organizationId: string;
        title: string;
        description: string;
        category: string;
        fileUri?: string | null;
        fileName?: string | null;
        mimeType?: string | null;
    }) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
            throw authError || new Error('No hay sesión activa');
        }

        let attachmentPath: string | null = null;

        try {
            if (params.fileUri) {
                attachmentPath = await uploadAttachment({
                    organizationId: params.organizationId,
                    userId: authData.user.id,
                    fileUri: params.fileUri,
                    fileName: params.fileName || `ticket-${Date.now()}.jpg`,
                    mimeType: params.mimeType,
                });
            }

            const { data, error } = await supabase.rpc('create_ticket', {
                p_org_id: params.organizationId,
                p_title: params.title,
                p_description: params.description,
                p_category: params.category,
                p_attachment_path: attachmentPath,
            });

            if (error) {
                throw error;
            }

            const row = (data as unknown as TicketRow[] | TicketRow | null) || null;
            const created = Array.isArray(row) ? row[0] : row;
            if (!created) {
                throw new Error('No se pudo crear la solicitud');
            }

            return mapTicketRow({
                ...created,
                reporter_name: authData.user.user_metadata?.full_name || authData.user.email || 'Vecino',
                reporter_email: authData.user.email || '',
                description: created.description || '',
                reply_count: 0,
                last_user_viewed_at: created.last_user_viewed_at || created.created_at,
                last_admin_viewed_at: created.last_admin_viewed_at || null,
                attachment_path: created.attachment_path || attachmentPath,
            } as TicketRow);
        } catch (error) {
            if (attachmentPath) {
                await supabase.storage.from(TICKET_ATTACHMENTS_BUCKET).remove([attachmentPath]);
            }
            throw error;
        }
    },

    async addComment(ticketId: string, body: string) {
        const { error } = await supabase.rpc('add_ticket_comment', {
            p_ticket_id: ticketId,
            p_body: body,
        });

        if (error) {
            throw error;
        }
    },

    async markSeen(ticketId: string, viewer: TicketViewer) {
        const { error } = await supabase.rpc('mark_ticket_seen', {
            p_ticket_id: ticketId,
            p_viewer: viewer,
        });

        if (error) {
            throw error;
        }
    },

    async setTicketStatus(ticketId: string, status: TicketStatus) {
        const { error } = await supabase.rpc('set_ticket_status', {
            p_ticket_id: ticketId,
            p_status: status,
        });

        if (error) {
            throw error;
        }
    },
};
