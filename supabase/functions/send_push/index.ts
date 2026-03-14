// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
};

const allowedTypes = new Set(['announcement', 'alert', 'event', 'ticket', 'dues', 'finance']);
const adminRoles = new Set(['director', 'secretary', 'treasurer', 'president', 'superadmin']);
const globalSuperadminEmail = 'javier.aravena25@gmail.com';

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: corsHeaders,
        });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
                status: 401,
                headers: corsHeaders,
            });
        }

        const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: {
                    Authorization: authHeader,
                },
            },
        });
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

        const { data: userData, error: authError } = await callerClient.auth.getUser();
        if (authError || !userData.user) {
            return new Response(JSON.stringify({ error: 'Invalid session' }), {
                status: 401,
                headers: corsHeaders,
            });
        }

        const payload = await req.json();
        const { organization_id, title, body, type, deep_link, payload: extraPayload } = payload || {};

        if (!organization_id || !title || !body || !type) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: corsHeaders,
            });
        }

        if (!allowedTypes.has(type)) {
            return new Response(JSON.stringify({ error: 'Invalid notification type' }), {
                status: 400,
                headers: corsHeaders,
            });
        }

        const isGlobalSuperadmin = userData.user.email?.toLowerCase() === globalSuperadminEmail;

        const { data: membership, error: membershipError } = await callerClient
            .from('memberships')
            .select('role')
            .eq('organization_id', organization_id)
            .eq('user_id', userData.user.id)
            .eq('is_active', true)
            .maybeSingle();

        if (!isGlobalSuperadmin && (membershipError || !membership || !adminRoles.has(membership.role))) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: corsHeaders,
            });
        }

        const { data: tokens, error: tokenError } = await serviceClient
            .from('push_tokens')
            .select('token')
            .eq('organization_id', organization_id)
            .eq('enabled', true);

        if (tokenError) throw tokenError;

        if (!tokens || tokens.length === 0) {
            return new Response(JSON.stringify({ message: 'No registered devices found' }), {
                status: 200,
                headers: corsHeaders,
            });
        }

        const messages = tokens.map(({ token }) => ({
            to: token,
            sound: 'default',
            title: String(title).slice(0, 120),
            body: String(body).slice(0, 500),
            data: {
                type,
                deep_link: deep_link || null,
                ...(extraPayload && typeof extraPayload === 'object' ? extraPayload : {}),
            },
        }));

        const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const expoResult = await expoResponse.json();

        await serviceClient.from('notifications').insert({
            organization_id,
            title: String(title).slice(0, 120),
            body: String(body).slice(0, 500),
            type,
            channel: 'push',
            deep_link: deep_link || null,
            payload: extraPayload && typeof extraPayload === 'object' ? extraPayload : {},
            created_by: userData.user.id,
        });

        return new Response(JSON.stringify({ success: true, expoResponse: expoResult }), {
            headers: corsHeaders,
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Unexpected error' }), {
            status: 500,
            headers: corsHeaders,
        });
    }
});
