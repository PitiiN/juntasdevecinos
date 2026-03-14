import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { ticketService, TicketItem } from '../../services/ticketService';

export default function MySolicitudesScreen({ navigation }: any) {
    const { organizationId } = useAuth();
    const [tickets, setTickets] = useState<TicketItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadTickets = useCallback(async () => {
        if (!organizationId) {
            setTickets([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await ticketService.getMyTickets(organizationId);
            setTickets(data);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudieron cargar tus solicitudes.');
            setTickets([]);
        } finally {
            setLoading(false);
        }
    }, [organizationId]);

    useFocusEffect(
        useCallback(() => {
            void loadTickets();
        }, [loadTickets]),
    );

    const handleWhatsApp = () => {
        const url = 'https://wa.me/56912345678';
        Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir WhatsApp.'));
    };

    const handleEmail = () => {
        const url = 'mailto:contacto@municipalidad.cl';
        Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir el correo.'));
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                    <Text style={s.backText}>← Volver</Text>
                </TouchableOpacity>

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

                <View style={s.noticeBox}>
                    <Text style={s.noticeText}>
                        Las solicitudes quedan registradas para trazabilidad y auditoría; por seguridad ya no se eliminan desde la app.
                    </Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#1E3A5F" style={{ marginTop: 32 }} />
                ) : tickets.length === 0 ? (
                    <View style={s.empty}>
                        <Text style={s.emptyEmoji}>📭</Text>
                        <Text style={s.emptyText}>No has enviado solicitudes aún</Text>
                    </View>
                ) : tickets.map((ticket) => (
                    <TouchableOpacity
                        key={ticket.id}
                        style={[s.card, ticket.isUnreadForUser && s.cardUnread]}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('SolicitudDetail', { id: ticket.id, isAdmin: false })}
                    >
                        <View style={s.cardHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.trackingCode}>{ticket.trackingCode}</Text>
                                <Text style={s.cardTitle} numberOfLines={1}>{ticket.title}</Text>
                            </View>
                            <View style={[s.badge, { backgroundColor: getStatusColor(ticket.status) }]}>
                                <Text style={s.badgeText}>{ticket.status}</Text>
                            </View>
                        </View>
                        <Text style={s.desc} numberOfLines={2}>{ticket.description}</Text>
                        <View style={s.cardMeta}>
                            <Text style={s.date}>📅 {ticket.createdDateLabel}</Text>
                            {ticket.replyCount > 0 && (
                                <Text style={s.replies}>💬 {ticket.replyCount} respuesta{ticket.replyCount > 1 ? 's' : ''}</Text>
                            )}
                            {ticket.attachmentUrl && <Text style={s.img}>📷</Text>}
                            {ticket.isUnreadForUser && <View style={s.newDot} />}
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const getStatusColor = (status: TicketItem['status']) => {
    switch (status) {
        case 'Abierta':
            return '#EF4444';
        case 'En proceso':
            return '#F59E0B';
        case 'Resuelta':
            return '#22C55E';
        case 'Rechazada':
            return '#94A3B8';
        default:
            return '#94A3B8';
    }
};

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 20 },
    back: { marginBottom: 16 },
    backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 16 },
    contactRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    contactBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2 },
    contactBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
    newBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
    newBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    noticeBox: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#BFDBFE' },
    noticeText: { color: '#1D4ED8', fontSize: 13, lineHeight: 18 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
    cardUnread: { borderWidth: 1, borderColor: '#93C5FD' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    trackingCode: { fontSize: 10, fontWeight: 'bold', color: '#64748B', marginBottom: 2 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', flex: 1, marginRight: 8 },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
    desc: { fontSize: 13, color: '#64748B', marginBottom: 6 },
    cardMeta: { flexDirection: 'row', alignItems: 'center' },
    date: { fontSize: 12, color: '#94A3B8', marginRight: 12 },
    replies: { fontSize: 12, color: '#2563EB', marginRight: 8 },
    img: { fontSize: 14, marginRight: 8 },
    newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 16, color: '#94A3B8' },
});
