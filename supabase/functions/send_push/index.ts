import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
    // CORS handling
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
            }
        });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            throw new Error('No authorization header');
        }

        // Parse payload
        const payload = await req.json();
        const { organization_id, title, body, type, deep_link } = payload;

        if (!organization_id || !title || !body) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Fetch tokens for this organization
        const { data: tokens, error: tokenError } = await supabase
            .from('push_tokens')
            .select('token')
            .eq('organization_id', organization_id)
            .eq('enabled', true);

        if (tokenError) throw tokenError;
        if (!tokens || tokens.length === 0) {
            return new Response(JSON.stringify({ message: 'No registered devices found' }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
            });
        }

        // Extract raw Expo push tokens
        const expoTokens = tokens.map(t => t.token);

        // Expo Push API format
        const messages = expoTokens.map(pushToken => ({
            to: pushToken,
            sound: 'default',
            title: title,
            body: body,
            data: { type, deep_link },
        }));

        // Send to Expo Push API
        const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });

        const expoResult = await expoResponse.json();

        // Log the notification to DB
        await supabase.from('notifications').insert({
            organization_id,
            title,
            body,
            type: type || 'system',
            send_status: 'sent'
        });

        return new Response(JSON.stringify({ success: true, expoResponse: expoResult }), {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
});
