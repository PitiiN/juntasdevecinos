import { supabase } from '../lib/supabase';

type NotificationType = 'announcement' | 'alert' | 'event' | 'ticket' | 'dues' | 'finance' | 'poll';

type PushRegistrationResult =
    | { status: 'registered'; token: string }
    | { status: 'unsupported'; message: string }
    | { status: 'permission_denied'; message: string };

type PushTestResult =
    | { mode: 'local-preview'; message: string }
    | { mode: 'remote-push'; message: string }
    | { mode: 'unsupported'; message: string };

const getRuntimeContext = () => {
    const Constants = require('expo-constants').default;
    const { Platform } = require('react-native');

    return {
        Constants,
        Platform,
        isWeb: Platform.OS === 'web',
        isExpoGo:
            Constants.appOwnership === 'expo' ||
            Constants.executionEnvironment === 'storeClient',
        projectId:
            Constants.expoConfig?.extra?.eas?.projectId ??
            '2b9db0c5-4372-43e8-96e7-800ebebf6faf',
    };
};

const ensureNotificationPermissions = async () => {
    const Notifications = require('expo-notifications');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
};

export const pushService = {
    async registerPushToken(userId: string, organizationId: string): Promise<PushRegistrationResult> {
        const { Platform, isWeb, isExpoGo, projectId } = getRuntimeContext();

        if (isWeb) {
            return {
                status: 'unsupported',
                message: 'Las notificaciones push no estan disponibles en web.',
            };
        }

        if (isExpoGo) {
            return {
                status: 'unsupported',
                message: 'Expo Go no soporta push remotas en Android desde SDK 53. Usa una development build o una build publicada.',
            };
        }

        const hasPermission = await ensureNotificationPermissions();
        if (!hasPermission) {
            return {
                status: 'permission_denied',
                message: 'Debes habilitar las notificaciones para este dispositivo.',
            };
        }

        const Notifications = require('expo-notifications');
        const token = (await Notifications.getExpoPushTokenAsync({
            projectId,
        })).data;

        const { error } = await supabase
            .from('push_tokens')
            .upsert({
                user_id: userId,
                organization_id: organizationId,
                platform: Platform.OS,
                token,
                enabled: true,
                last_seen_at: new Date().toISOString(),
            }, {
                onConflict: 'platform,token',
            });

        if (error) {
            throw error;
        }

        return { status: 'registered', token };
    },

    async sendPushNotification(payload: {
        organization_id: string;
        token?: string;
        title: string;
        body: string;
        type: NotificationType;
        deep_link?: string;
        payload?: Record<string, unknown>;
    }) {
        const normalizedPayload = {
            ...payload,
            type: payload.type === 'poll' ? 'announcement' : payload.type,
        };

        console.log('[PushService] Invoking send_push with:', JSON.stringify(normalizedPayload, null, 2));

        const { data, error } = await supabase.functions.invoke('send_push', {
            body: normalizedPayload,
        });

        if (error) {
            console.error('[PushService] Edge Function Error:', error);
            throw error;
        }

        console.log('[PushService] send_push response:', data);
        return data;
    },

    async broadcastPushNotification(
        payloadOrTitle: {
            organization_id: string;
            title: string;
            body: string;
            type: NotificationType;
            deep_link?: string;
            payload?: Record<string, unknown>;
        } | string,
        legacyBody?: string,
        legacyPayload?: { type?: NotificationType; [key: string]: unknown }
    ) {
        if (typeof payloadOrTitle === 'string') {
            console.warn('broadcastPushNotification without organization_id is blocked for security reasons.');
            return null;
        }

        return this.sendPushNotification(payloadOrTitle);
    },

    async sendAdminPushTest(params: { userId: string; organizationId: string }): Promise<PushTestResult> {
        const { isWeb, isExpoGo } = getRuntimeContext();

        if (isWeb) {
            return {
                mode: 'unsupported',
                message: 'Las notificaciones push no se pueden probar desde web.',
            };
        }

        if (isExpoGo) {
            const Notifications = require('expo-notifications');
            const hasPermission = await ensureNotificationPermissions();

            if (!hasPermission) {
                throw new Error('Debes habilitar las notificaciones para esta aplicacion.');
            }

            await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Prueba local JJVV',
                    body: 'Expo Go no soporta push remotas en Android. Esta prueba es solo local.',
                    data: { scope: 'local-preview' },
                    sound: true,
                },
                trigger: null,
            });

            return {
                mode: 'local-preview',
                message: 'Se envio una notificacion local. Para push remotas reales usa una development build o una build publicada.',
            };
        }

        const registrationResult = await this.registerPushToken(params.userId, params.organizationId);
        if (registrationResult.status === 'unsupported') {
            return {
                mode: 'unsupported',
                message: registrationResult.message,
            };
        }

        if (registrationResult.status === 'permission_denied') {
            throw new Error(registrationResult.message);
        }

        try {
            await this.sendPushNotification({
                organization_id: params.organizationId,
                title: 'Prueba push JJVV',
                body: 'Esta es una notificacion push real enviada desde la plataforma JJVV.',
                type: 'announcement',
                payload: { test: true },
            });
        } catch (error: any) {
            const message = String(error?.message || '');
            if (message.includes('FunctionsHttpError') || message.includes('non-2xx')) {
                throw new Error('La funcion send_push no esta disponible o rechazo la solicitud. Despliegala nuevamente antes de probar.');
            }
            throw error;
        }

        return {
            mode: 'remote-push',
            message: 'Se envio una notificacion push real al dispositivo actual.',
        };
    },
};
