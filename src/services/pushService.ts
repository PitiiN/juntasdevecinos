import { supabase } from '../lib/supabase';

export const pushService = {
    // Register push token
    async registerPushToken(userId: string, organizationId: string) {
        const Constants = require('expo-constants').default;
        const { Platform } = require('react-native');
        if (Platform.OS === 'web' || Constants.appOwnership === 'expo') {
            console.log('Skipping push token registration in Web or Expo Go (SDK 53 limitation).');
            return;
        }

        const Notifications = require('expo-notifications');
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        try {
            const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? '2b9db0c5-4372-43e8-96e7-800ebebf6faf';
            const token = (await Notifications.getExpoPushTokenAsync({
                projectId,
            })).data;

            console.log('Push token:', token);

            // Save to Supabase
            const { error } = await supabase
                .from('push_tokens')
                .upsert({
                    user_id: userId,
                    organization_id: organizationId,
                    platform: Platform.OS,
                    token: token,
                    enabled: true,
                    last_seen_at: new Date().toISOString()
                }, {
                    onConflict: 'platform,token'
                });

            if (error) throw error;

        } catch (e) {
            console.error('Error getting or saving push token:', e);
        }
    },

    // Send a push notification by calling Edge Function
    async sendPushNotification(payload: {
        organization_id: string;
        title: string;
        body: string;
        data?: any;
    }) {
        const { data, error } = await supabase.functions.invoke('send-push', {
            body: payload
        });
        if (error) throw error;
        return data;
    },

    // Broadcast a push notification (Simulated for all users for MVP purposes without Edge Functions)
    async broadcastPushNotification(title: string, body: string, data?: any) {
        try {
            const Constants = require('expo-constants').default;
            const Notifications = require('expo-notifications');
            if (Constants.appOwnership === 'expo') {
                await Notifications.scheduleNotificationAsync({
                    content: { title, body, data, sound: true, },
                    trigger: null,
                });
                return;
            }

            // Real Production Broadcast
            // 1. In a real-world scenario with backend Edge Functions:
            // return this.sendPushNotification({ organization_id: '...', title, body, data });

            // 2. For MVP simulating a global broadcast directly from the Admin's device:
            const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? '2b9db0c5-4372-43e8-96e7-800ebebf6faf';
            const adminTokenInfo = await Notifications.getExpoPushTokenAsync({ projectId });

            await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: adminTokenInfo.data, // Currently sending ONLY to the Admin for testing/simulation due to lack of a fully populated User Push Token database fetching logic. In a real deployment, this would be an array of all user tokens fetched from the `push_tokens` table.
                    sound: 'default',
                    title: title,
                    body: body,
                    data: data || {},
                }),
            });
        } catch (error) {
            console.error('Error broadcasting notification:', error);
        }
    }
};
