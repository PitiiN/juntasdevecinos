import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';

export default function MySolicitudesScreen({ navigation }: any) {
    const { user } = useAuth();
    const solicitudes = useAppStore(s => s.solicitudes);
    const removeSolicitud = useAppStore(s => s.removeSolicitud);
    const mySolicitudes = solicitudes.filter(s => s.userEmail === user?.email || s.user === user?.user_metadata?.full_name);

    const getStatusColor = (s: string) => {
        switch (s) { case 'Abierta': return '#EF4444'; case 'En proceso': return '#F59E0B'; case 'Resuelta': return '#22C55E'; case 'Rechazada': return '#94A3B8'; default: return '#94A3B8'; }
    };

    const handleDelete = (sol: any) => {
        Alert.alert(
            '¿Eliminar solicitud?',
            `"${sol.title}" será eliminada permanentemente.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar', style: 'destructive', onPress: () => {
                        removeSolicitud(sol.id);
                        Alert.alert('✅ Eliminada', 'La solicitud ha sido eliminada.');
                    }
                },
            ]
        );
    };

    const handleWhatsApp = () => {
        const url = 'https://wa.me/56912345678'; // Placeholder
        Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp.'));
    };

    const handleEmail = () => {
        const url = 'mailto:contacto@municipalidad.cl'; // Placeholder
        Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el correo.'));
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Text style={s.backText}>← Volver</Text></TouchableOpacity>
                <Text style={s.title}>📝 Mis Solicitudes</Text>

                <View style={s.contactRow}>
                    <TouchableOpacity style={[s.contactBtn, { backgroundColor: '#25D366' }]} onPress={handleWhatsApp}>
                        <Text style={s.contactBtnText}>🟢 Whatsapp Municipal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.contactBtn, { backgroundColor: '#3B82F6' }]} onPress={handleEmail}>
                        <Text style={s.contactBtnText}>📧 Correo Municipal</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={s.newBtn} onPress={() => navigation.navigate('NewSolicitud')}>
                    <Text style={s.newBtnText}>+ Nueva Solicitud</Text>
                </TouchableOpacity>

                {mySolicitudes.length === 0 ? (
                    <View style={s.empty}><Text style={s.emptyEmoji}>📭</Text><Text style={s.emptyText}>No has enviado solicitudes aún</Text></View>
                ) : mySolicitudes.map(sol => (
                    <View key={sol.id} style={s.card}>
                        <TouchableOpacity onPress={() => navigation.navigate('SolicitudDetail', { id: sol.id })} activeOpacity={0.7}>
                            <View style={s.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.trackingCode}>{sol.trackingNumber}</Text>
                                    <Text style={s.cardTitle} numberOfLines={1}>{sol.title}</Text>
                                </View>
                                <View style={[s.badge, { backgroundColor: getStatusColor(sol.status) }]}><Text style={s.badgeText}>{sol.status}</Text></View>
                            </View>
                            <Text style={s.desc} numberOfLines={2}>{sol.description}</Text>
                            <View style={s.cardMeta}>
                                <Text style={s.date}>📅 {sol.date}</Text>
                                {sol.replies.length > 0 && <Text style={s.replies}>💬 {sol.replies.length} respuesta{sol.replies.length > 1 ? 's' : ''}</Text>}
                                {sol.hasImage && <Text style={s.img}>📷</Text>}
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(sol)}>
                            <Text style={s.deleteText}>🗑️ Eliminar</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' }, scroll: { padding: 20 },
    back: { marginBottom: 16 }, backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 16 },
    contactRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    contactBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2 },
    contactBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
    newBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
    newBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    trackingCode: { fontSize: 10, fontWeight: 'bold', color: '#64748B', marginBottom: 2 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', flex: 1, marginRight: 8 },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }, badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
    desc: { fontSize: 13, color: '#64748B', marginBottom: 6 },
    cardMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    date: { fontSize: 12, color: '#94A3B8', marginRight: 12 },
    replies: { fontSize: 12, color: '#2563EB', marginRight: 8 }, img: { fontSize: 14 },
    deleteBtn: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8, alignItems: 'center' },
    deleteText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
    empty: { alignItems: 'center', paddingVertical: 40 }, emptyEmoji: { fontSize: 48, marginBottom: 12 }, emptyText: { fontSize: 16, color: '#94A3B8' },
});
