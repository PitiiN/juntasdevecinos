import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';

export default function DashboardScreen() {
    const navigation = useNavigation<any>();
    const { organizationLogoUrl, organizationName } = useAuth();
    const { announcements, solicitudes, documents, members } = useAppStore();

    const openSolicitudes = solicitudes.filter(s => s.status === 'Abierta').length;

    const stats = [
        { label: 'Socios', value: members.length.toString(), icon: '👥', color: '#FFF7ED', tab: 'Admin', screen: 'ManageMembers' },
        { label: 'Avisos', value: announcements.length.toString(), icon: '📢', color: '#F1F5F9', tab: 'Avisos' },
        { label: 'Solicitudes', value: openSolicitudes.toString(), icon: '📝', color: '#FFF7ED', tab: 'Solicitudes' },
        { label: 'Documentos', value: documents.length.toString(), icon: '📁', color: '#F1F5F9', tab: 'Docs' },
        { label: 'Finanzas', value: '💰', icon: '💰', color: '#FFF7ED', tab: 'Admin', screen: 'AdminFinance' },
        { label: 'Favores', value: '📌', icon: '📌', color: '#F1F5F9', tab: 'Admin', screen: 'Favores' },
        { label: 'Agenda', value: '📅', icon: '📅', color: '#FFF7ED', tab: 'Admin', screen: 'Agenda' },
        { label: 'Mapa', value: '🗺️', icon: '🗺️', color: '#F1F5F9', tab: 'Admin', screen: 'MapaAdmin' },
        { label: 'Config', value: '⚙️', icon: '⚙️', color: '#FFF7ED', tab: 'Admin', screen: 'AdminSettings' },
    ];

    const handlePress = (stat: typeof stats[0]) => {
        if (stat.screen) {
            navigation.navigate(stat.tab, { screen: stat.screen });
        } else {
            navigation.navigate(stat.tab);
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <View style={s.header}>
                    <Text style={s.headerTitle}>Panel de Administración</Text>
                    <Text style={s.headerSub}>Junta de Vecinos UV 22 • San Miguel</Text>
                </View>

                <Text style={s.section}>Accesos rápidos</Text>
                <View style={s.grid}>
                    {stats.map((stat, i) => (
                        <TouchableOpacity key={i} style={[s.card, { backgroundColor: stat.color }]} onPress={() => handlePress(stat)} activeOpacity={0.7}>
                            <Text style={s.cardIcon}>{stat.icon}</Text>
                            <Text style={s.cardLabel}>{stat.label}</Text>
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
    header: { backgroundColor: '#1E3A5F', borderRadius: 16, padding: 14, marginBottom: 20 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
    headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
    logo: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFFFFF', marginLeft: 10 },
    section: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginBottom: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
    card: { width: '31%', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center', marginBottom: 10, elevation: 2 },
    cardIcon: { fontSize: 26, marginBottom: 4 },
    cardLabel: { fontSize: 12, fontWeight: '600', color: '#334155', textAlign: 'center' },
});
