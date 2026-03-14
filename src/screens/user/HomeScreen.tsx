import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../lib/store';
import { useAccessibility } from '../../context/AccessibilityContext';
import { useTicketCounters } from '../../hooks/useTicketCounters';

export default function HomeScreen() {
    const { user, organizationId, organizationLogoUrl, organizationName } = useAuth();
    const navigation = useNavigation<any>();
    const announcements = useAppStore(s => s.announcements);
    const documents = useAppStore(s => s.documents);
    const seenAvisosCount = useAppStore(s => s.seenAvisosCount);
    const seenDocsCount = useAppStore(s => s.seenDocsCount);
    const markAvisosSeen = useAppStore(s => s.markAvisosSeen);
    const { ttsEnabled } = useAccessibility();
    const displayName = user?.user_metadata?.full_name || 'Vecino';
    const [speaking, setSpeaking] = useState<string | null>(null);

    const unreadAvisos = Math.max(0, announcements.length - (seenAvisosCount || 0));
    const unreadDocs = Math.max(0, documents.length - seenDocsCount);
    const { myUnreadCount: unreadSolicitudes } = useTicketCounters(organizationId);

    useFocusEffect(
        useCallback(() => {
            return () => {
                Speech.stop();
                setSpeaking(null);
            };
        }, [])
    );

    const goToTab = (tabName: string) => {
        if (tabName === 'Avisos') markAvisosSeen();
        navigation.dispatch(
            CommonActions.navigate({ name: tabName, params: {} })
        );
    };

    const quickActions = [
        { title: 'Avisos', emoji: '📢', bg: '#FFF7ED', badge: unreadAvisos, onPress: () => goToTab('Avisos') },
        { title: 'Encuestas', emoji: '📊', bg: '#F1F5F9', badge: 0, onPress: () => navigation.navigate('Más', { screen: 'Polls' }) },
        { title: 'Agenda', emoji: '📅', bg: '#FFF7ED', badge: 0, onPress: () => goToTab('Agenda') },
        { title: 'Solicitudes', emoji: '📝', bg: '#F1F5F9', badge: unreadSolicitudes, onPress: () => navigation.navigate('Más', { screen: 'Solicitudes' }) },
        { title: 'Favores', emoji: '🤝', bg: '#FFF7ED', badge: 0, onPress: () => navigation.navigate('Más', { screen: 'Favores' }) },
        { title: 'Cuotas', emoji: '💸', bg: '#F1F5F9', badge: 0, onPress: () => navigation.navigate('Más', { screen: 'Dues' }) },
        { title: 'Mapa', emoji: '🗺️', bg: '#FFF7ED', badge: 0, onPress: () => navigation.navigate('Más', { screen: 'NeighborhoodMap' }) },
        { title: 'Emergencia', emoji: '🆘', bg: '#F1F5F9', badge: 0, onPress: () => goToTab('S.O.S') },
        { title: 'Documentos', emoji: '📁', bg: '#FFF7ED', badge: unreadDocs, onPress: () => navigation.navigate('Más', { screen: 'Documents' }) },
        { title: 'Directiva', emoji: '🏢', bg: '#F1F5F9', badge: 0, onPress: () => navigation.navigate('Más', { screen: 'Directiva' }) },
        { title: 'Accesibilidad', emoji: '☉', bg: '#FFF7ED', badge: 0, onPress: () => navigation.navigate('Más', { screen: 'Accessibility' }) },
        { title: 'Perfil', emoji: '👤', bg: '#F1F5F9', badge: 0, onPress: () => navigation.navigate('Más', { screen: 'Profile' }) },
    ];

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <View style={s.greeting}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.greetTitle}>¡Hola, {displayName}!</Text>
                            <Text style={s.greetSub}>{organizationName || 'Bienvenido a tu Junta de Vecinos'}</Text>
                        </View>
                        {organizationLogoUrl && (
                            <Image source={{ uri: organizationLogoUrl }} style={s.logo} resizeMode="contain" />
                        )}
                    </View>
                </View>

                <Text style={s.section}>Accesos rápidos</Text>
                <View style={s.grid}>
                    {quickActions.map((action, i) => (
                        <TouchableOpacity key={i} style={[s.card, { backgroundColor: action.bg }]} activeOpacity={0.7} onPress={action.onPress}>
                            <View style={s.cardInner}>
                                <Text style={s.cardEmoji}>{action.emoji}</Text>
                                {action.badge > 0 && (
                                    <View style={s.badge}><Text style={s.badgeText}>{action.badge > 9 ? '9+' : action.badge}</Text></View>
                                )}
                            </View>
                            <Text style={s.cardTitle}>{action.title}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' }, 
    scroll: { padding: 20 },
    greeting: { backgroundColor: '#1E3A5F', borderRadius: 16, padding: 18, marginBottom: 20 },
    greetTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' }, 
    greetSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
    logo: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', marginLeft: 10 },
    section: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
    card: { width: '31%', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', marginBottom: 10, elevation: 2 },
    cardInner: { position: 'relative', marginBottom: 4 },
    cardEmoji: { fontSize: 26 }, 
    cardTitle: { fontSize: 12, fontWeight: '600', color: '#334155', textAlign: 'center' },
    badge: { position: 'absolute', top: -6, right: -14, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
});
