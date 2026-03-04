import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../lib/store';
import { useAccessibility } from '../../context/AccessibilityContext';

export default function HomeScreen() {
    const { user } = useAuth();
    const navigation = useNavigation<any>();
    const announcements = useAppStore(s => s.announcements);
    const solicitudes = useAppStore(s => s.solicitudes);
    const documents = useAppStore(s => s.documents);
    const seenAvisosCount = useAppStore(s => s.seenAvisosCount);
    const seenDocsCount = useAppStore(s => s.seenDocsCount);
    const markAvisosSeen = useAppStore(s => s.markAvisosSeen);
    const { ttsEnabled } = useAccessibility();
    const displayName = user?.user_metadata?.full_name || 'Vecino';
    const mySolicitudes = solicitudes.filter(s => s.userEmail === user?.email || s.user === user?.user_metadata?.full_name);
    const unreadSolicitudes = mySolicitudes.filter(s => !s.seenByUser).length;
    const [speaking, setSpeaking] = useState<string | null>(null);

    const unreadAvisos = Math.max(0, announcements.length - seenAvisosCount);
    const unreadDocs = Math.max(0, documents.length - seenDocsCount);

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
        { title: 'Avisos', emoji: '📢', bg: '#EFF6FF', badge: unreadAvisos, onPress: () => goToTab('Avisos') },
        { title: 'Encuestas', emoji: '📊', bg: '#FFF7ED', badge: 0, onPress: () => { navigation.dispatch(CommonActions.navigate({ name: 'Avisos', params: { initialTab: 'encuestas' } })); } },
        { title: 'Emergencia', emoji: '🆘', bg: '#FEF2F2', badge: 0, onPress: () => goToTab('S.O.S') },
        { title: 'Agenda', emoji: '📅', bg: '#F5F3FF', badge: 0, onPress: () => goToTab('Agenda') },
        { title: 'Solicitudes', emoji: '📝', bg: '#FFFBEB', badge: unreadSolicitudes, onPress: () => navigation.navigate('Más', { screen: 'Solicitudes' }) },
        { title: 'Cuotas', emoji: '💸', bg: '#F0FDF4', badge: 0, onPress: () => navigation.navigate('Más', { screen: 'Dues' }) },
        { title: 'Documentos', emoji: '📁', bg: '#F0FDF4', badge: unreadDocs, onPress: () => navigation.navigate('Más', { screen: 'Documents' }) },
        { title: 'Favores', emoji: '🤝', bg: '#FFF7ED', badge: 0, onPress: () => navigation.navigate('Más', { screen: 'Favores' }) },
        { title: 'Mapa', emoji: '🗺️', bg: '#EFF6FF', badge: 0, onPress: () => navigation.navigate('Más', { screen: 'NeighborhoodMap' }) },
        { title: 'Perfil', emoji: '👤', bg: '#F5F3FF', badge: 0, onPress: () => navigation.navigate('Más', { screen: 'Profile' }) },
        { title: 'Accesibilidad', emoji: '☉', bg: '#FFFBEB', badge: 0, onPress: () => navigation.navigate('Más', { screen: 'Accessibility' }) },
    ];

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <View style={s.greeting}>
                    <Text style={s.greetTitle}>¡Hola, {displayName}!</Text>
                    <Text style={s.greetSub}>Bienvenido a tu Junta de Vecinos</Text>
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
    safe: { flex: 1, backgroundColor: 'transparent' }, scroll: { padding: 20 },
    greeting: { backgroundColor: '#1E3A5F', borderRadius: 16, padding: 14, marginBottom: 20 },
    greetTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' }, greetSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
    section: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
    card: { width: '31%', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', marginBottom: 10, elevation: 2 },
    cardInner: { position: 'relative', marginBottom: 4 },
    cardEmoji: { fontSize: 26 }, cardTitle: { fontSize: 12, fontWeight: '600', color: '#334155', textAlign: 'center' },
    badge: { position: 'absolute', top: -6, right: -14, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
});
