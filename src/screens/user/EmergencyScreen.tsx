import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EmergencyScreen() {
    const call = (number: string) => {
        Linking.openURL(`tel:${number}`).catch(() =>
            Alert.alert('Error', 'No se pudo realizar la llamada. Verifica que tu dispositivo soporte llamadas.')
        );
    };

    const emergencyButtons = [
        { title: 'Bomberos', sub: 'Incendios y rescate', emoji: '🚒', number: '131', color: '#EF4444' },
        { title: 'Carabineros', sub: 'Seguridad pública', emoji: '🚔', number: '133', color: '#2563EB' },
        { title: 'Ambulancia (SAMU)', sub: 'Emergencia médica', emoji: '🚑', number: '131', color: '#22C55E' },
        { title: 'PDI', sub: 'Policía de Investigaciones', emoji: '🔐', number: '132', color: '#7C3AED' },
    ];

    const communityButtons = [
        { title: 'Gestor Territorial', sub: 'Contacto municipal', emoji: '🏛️', number: '000000000', color: '#0891B2' },
        { title: 'Seguridad Ciudadana', sub: 'Alarmas comunitarias', emoji: '🛡️', number: '000000000', color: '#4F46E5' },
        { title: 'Comisaría San Miguel', sub: 'Subcomisaría local', emoji: '🏢', number: '000000000', color: '#1D4ED8' },
        { title: 'Cesfam Angel Guarello', sub: 'Centro de salud', emoji: '🏥', number: '000000000', color: '#059669' },
        { title: 'Cesfam Recreo', sub: 'Centro de salud', emoji: '🏥', number: '000000000', color: '#10B981' },
    ];

    const renderBtn = (item: typeof emergencyButtons[0], i: number) => (
        <TouchableOpacity key={i} style={[s.btn, { backgroundColor: item.color }]} onPress={() => call(item.number)} activeOpacity={0.6}>
            <Text style={s.emoji}>{item.emoji}</Text>
            <View style={s.btnInfo}>
                <Text style={s.btnTitle}>{item.title}</Text>
                <Text style={s.btnSub}>{item.sub}</Text>
            </View>
            <Text style={s.btnNum}>{item.number}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.container}>
                <Text style={s.title}>🆘 Emergencia</Text>
                <Text style={s.sub}>Presiona para llamar al servicio de emergencia</Text>

                {emergencyButtons.map(renderBtn)}

                <Text style={s.sectionTitle}>📞 Contactos Comunitarios</Text>
                {communityButtons.map(renderBtn)}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#FEF2F2' },
    container: { padding: 20, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#991B1B', textAlign: 'center' },
    sub: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E3A5F', marginTop: 20, marginBottom: 12 },
    btn: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 10, elevation: 4 },
    emoji: { fontSize: 28, marginRight: 12 },
    btnInfo: { flex: 1 },
    btnTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
    btnSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    btnNum: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
});
