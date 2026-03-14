import { supabase } from '../lib/supabase';

export type DeleteAccountResult = {
    success: boolean;
    deleted: string[];
    retained: string[];
};

export const accountService = {
    async deleteMyAccount(): Promise<DeleteAccountResult> {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            throw sessionError;
        }

        const accessToken = sessionData.session?.access_token;
        if (!accessToken) {
            throw new Error('No hay una sesion activa para eliminar la cuenta');
        }

        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
        const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Falta la configuracion publica de Supabase en la app');
        }

        const response = await fetch(`${supabaseUrl}/functions/v1/delete_account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                apikey: supabaseAnonKey,
            },
            body: JSON.stringify({
                confirmation: 'DELETE_ACCOUNT',
            }),
        });

        let payload: any = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }

        if (!response.ok) {
            throw new Error(payload?.error || `No se pudo eliminar la cuenta (${response.status})`);
        }

        if (!payload?.success) {
            throw new Error(payload?.error || 'No se pudo eliminar la cuenta');
        }

        return payload as DeleteAccountResult;
    },
};
