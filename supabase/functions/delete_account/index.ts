// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
};

const globalSuperadminEmail = 'javier.aravena25@gmail.com';
const accountDeletionConfirmation = 'DELETE_ACCOUNT';

const createJsonResponse = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: corsHeaders,
    });

const chunk = <T>(items: T[], size: number) => {
    const batches: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
        batches.push(items.slice(index, index + size));
    }
    return batches;
};

const uniqueStrings = (values: Array<string | null | undefined>) =>
    [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];

const getErrorMessage = (error: unknown, fallback: string) => {
    if (!error || typeof error !== 'object') {
        return fallback;
    }

    if ('message' in error && typeof error.message === 'string') {
        return error.message;
    }

    return fallback;
};

const removeBucketPaths = async (
    serviceClient: ReturnType<typeof createClient>,
    bucketName: string,
    paths: string[],
) => {
    for (const batch of chunk(paths, 100)) {
        const { error } = await serviceClient.storage.from(bucketName).remove(batch);
        if (error) {
            throw error;
        }
    }
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return createJsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            console.error('delete_account: missing authorization header');
            return createJsonResponse({ error: 'Missing authorization header' }, 401);
        }

        const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim();
        if (!accessToken) {
            console.error('delete_account: missing bearer token');
            return createJsonResponse({ error: 'Missing bearer token' }, 401);
        }

        const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        console.log('delete_account: validating access token');
        const { data: userData, error: userError } = await serviceClient.auth.getUser(accessToken);
        if (userError || !userData.user) {
            console.error('delete_account: invalid session', userError?.message || null);
            return createJsonResponse(
                { error: userError?.message || 'Invalid session' },
                401,
            );
        }

        const user = userData.user;
        const email = (user.email || '').toLowerCase();
        console.log('delete_account: request received for user', user.id);

        if (email === globalSuperadminEmail) {
            return createJsonResponse(
                { error: 'The reserved global superadmin account must be deleted manually' },
                403,
            );
        }

        let payload: Record<string, unknown> = {};
        try {
            payload = await req.json();
        } catch {
            payload = {};
        }

        if (payload.confirmation !== accountDeletionConfirmation) {
            return createJsonResponse({ error: 'Deletion confirmation is required' }, 400);
        }

        const { data: duesRows, error: duesSelectError } = await serviceClient
            .from('dues_ledger')
            .select('organization_id, proof_path')
            .eq('user_id', user.id);

        if (duesSelectError) {
            throw duesSelectError;
        }

        const { data: ticketRows, error: ticketSelectError } = await serviceClient
            .from('tickets')
            .select('organization_id, attachment_path')
            .eq('created_by', user.id);

        if (ticketSelectError) {
            throw ticketSelectError;
        }

        const { data: replyRows, error: replySelectError } = await serviceClient
            .from('announcement_replies')
            .select('media_path')
            .eq('author_id', user.id);

        if (replySelectError) {
            throw replySelectError;
        }

        const duesPaths = uniqueStrings([
            ...((duesRows || []) as Array<{ proof_path: string | null }>).map((row) => row.proof_path),
        ]);
        const ticketAttachmentPaths = uniqueStrings([
            ...((ticketRows || []) as Array<{ attachment_path: string | null }>).map((row) => row.attachment_path),
        ]);
        const replyMediaPaths = uniqueStrings([
            ...((replyRows || []) as Array<{ media_path: string | null }>).map((row) => row.media_path),
        ]);

        if (duesPaths.length > 0) {
            await removeBucketPaths(serviceClient, 'jjvv-dues-proofs', duesPaths);
        }

        if (ticketAttachmentPaths.length > 0) {
            await removeBucketPaths(serviceClient, 'jjvv-ticket-attachments', ticketAttachmentPaths);
        }

        if (replyMediaPaths.length > 0) {
            await removeBucketPaths(serviceClient, 'jjvv-announcement-replies', replyMediaPaths);
        }

        const mutations: Array<Promise<{ error: unknown }>> = [
            serviceClient
                .from('dues_ledger')
                .update({ proof_path: null })
                .eq('user_id', user.id)
                .not('proof_path', 'is', null),
            serviceClient
                .from('dues_ledger')
                .update({ updated_by: null })
                .eq('updated_by', user.id),
            serviceClient
                .from('ticket_comments')
                .delete()
                .eq('author_id', user.id),
            serviceClient
                .from('tickets')
                .delete()
                .eq('created_by', user.id),
            serviceClient
                .from('announcement_replies')
                .delete()
                .eq('author_id', user.id),
            serviceClient
                .from('favor_replies')
                .delete()
                .eq('user_id', user.id),
            serviceClient
                .from('favors')
                .delete()
                .eq('user_id', user.id),
            serviceClient
                .from('poll_votes')
                .delete()
                .eq('user_id', user.id),
            serviceClient
                .from('event_registrations')
                .delete()
                .eq('user_id', user.id),
            serviceClient
                .from('alerts')
                .delete()
                .eq('created_by', user.id),
            serviceClient
                .from('push_tokens')
                .delete()
                .eq('user_id', user.id),
            serviceClient
                .from('memberships')
                .delete()
                .eq('user_id', user.id),
            serviceClient
                .from('profiles')
                .delete()
                .eq('user_id', user.id),
        ];

        for (const mutation of mutations) {
            const { error } = await mutation;
            if (error) {
                throw error;
            }
        }

        const { error: deleteUserError } = await serviceClient.auth.admin.deleteUser(user.id, true);
        if (deleteUserError) {
            throw deleteUserError;
        }

        return createJsonResponse({
            success: true,
            deleted: [
                'auth_access',
                'profile',
                'memberships',
                'push_tokens',
                'event_registrations',
                'poll_votes',
                'favors',
                'favor_replies',
                'announcement_replies',
                'alerts_created_by_user',
                'tickets_created_by_user',
                'ticket_comments_created_by_user',
                'private_storage_files',
            ],
            retained: [
                'dues_ledger_status_history_without_uploaded_files',
                'community_documents_and_admin_content_already_published',
                'finance_and_audit_history_required_for_jjvv_operations',
            ],
        });
    } catch (error) {
        console.error('delete_account: unexpected error', getErrorMessage(error, 'Unexpected error while deleting account'));
        return createJsonResponse(
            { error: getErrorMessage(error, 'Unexpected error while deleting account') },
            500,
        );
    }
});
