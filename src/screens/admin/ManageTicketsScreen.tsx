import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ManageTicketsScreen() {
    const tickets = [
        { id: '1', title: 'Luminaria rota calle Los Aromos', status: 'Abierto', user: 'María González' },
        { id: '2', title: 'Bache frente a la sede', status: 'En proceso', user: 'Carlos Pérez' },
        { id: '3', title: 'Ruidos molestos sector norte', status: 'Cerrado', user: 'Ana López' },
    ];
    const getColor = (s: string) => s === 'Abierto' ? '#EF4444' : s === 'En proceso' ? '#F59E0B' : '#22C55E';

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <Text style={s.title}>🎫 Bandeja de Tickets</Text>
                {tickets.map(t => (
                    <View key={t.id} style={s.card}>
                        <View style={s.row}>
                            <Text style={s.cardTitle}>{t.title}</Text>
                            <View style={[s.badge, { backgroundColor: getColor(t.status) }]}>
                                <Text style={s.badgeText}>{t.status}</Text>
                            </View>
                        </View>
                        <Text style={s.user}>👤 {t.user}</Text>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#0F172A' },
    scroll: { padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 16 },
    card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 8 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { fontSize: 14, fontWeight: '600', color: '#F1F5F9', flex: 1 },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 },
    badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
    user: { fontSize: 12, color: '#94A3B8', marginTop: 6 },
});
