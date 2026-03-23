import React, { useCallback, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { poiService } from '../../services/poiService';
import { useAuth } from '../../context/AuthContext';
import { ticketService, TicketComment, TicketItem } from '../../services/ticketService';

export default function SolicitudDetailScreen({ route, navigation }: any) {
    const { id, isAdmin: requestedAdmin } = route.params;
    const { user, organizationId, isAdmin, viewMode } = useAuth();
    const [ticket, setTicket] = useState<TicketItem | null>(null);
    const [comments, setComments] = useState<TicketComment[]>([]);
    const [reply, setReply] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const isAdminContext = requestedAdmin && isAdmin && viewMode === 'admin';

    const loadTicket = useCallback(async () => {
        if (!organizationId) {
            setTicket(null);
            setComments([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const [ticketData, commentsData] = await Promise.all([
                ticketService.getTicketById(id, organizationId, isAdminContext ? 'admin' : 'user'),
                ticketService.getTicketComments(id),
                ticketService.markSeen(id, isAdminContext ? 'admin' : 'user'),
            ]);

            setTicket(ticketData);
            setComments(commentsData);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo cargar la solicitud.');
            setTicket(null);
            setComments([]);
        } finally {
            setLoading(false);
        }
    }, [id, isAdminContext, organizationId]);

    useFocusEffect(
        useCallback(() => {
            void loadTicket();
        }, [loadTicket]),
    );

    if (loading) {
        return (
            <SafeAreaView style={s.safe}>
                <ActivityIndicator size="large" color="#1E3A5F" style={{ marginTop: 48 }} />
            </SafeAreaView>
        );
    }

    if (!ticket) {
        return (
            <SafeAreaView style={s.safe}>
                <Text style={s.noData}>Solicitud no encontrada</Text>
            </SafeAreaView>
        );
    }

    const handleChangeStatus = () => {
        Alert.alert('Cambiar estado', 'Selecciona el nuevo estado:', [
            { text: 'En proceso', onPress: () => void updateStatus('in_progress') },
            { text: 'Resuelta', onPress: () => void updateStatus('resolved') },
            { text: 'Rechazada', onPress: () => void updateStatus('rejected') },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    };

    const updateStatus = async (status: 'in_progress' | 'resolved' | 'rejected') => {
        try {
            await ticketService.setTicketStatus(ticket.id, status);
            await loadTicket();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo actualizar el estado.');
        }
    };

    const handleSendReply = async () => {
        if (!reply.trim()) {
            return;
        }

        setSending(true);
        try {
            await ticketService.addComment(ticket.id, reply);
            setReply('');
            await loadTicket();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo enviar el mensaje.');
        } finally {
            setSending(false);
        }
    };

    const approveMapPin = async () => {
        const lines = ticket.description
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);

        const normalize = (value: string) =>
            value
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase();

        const extractValue = (needle: string) => {
            const line = lines.find((item) => normalize(item).includes(needle) && item.includes(':'));
            if (!line) return '';
            return line.slice(line.indexOf(':') + 1).trim();
        };

        const titleFromBody = extractValue('nombre');
        const descriptionFromBody = extractValue('descripci');
        const typeFromBody = extractValue('tipo');
        const emojiFromBody = extractValue('emoji');
        const locationFromBody = extractValue('ubicaci');

        const title = titleFromBody || ticket.title.replace('PIN: ', '').replace('\u{1F4CD} Pin: ', '');
        const description = descriptionFromBody || title;
        const category = normalize(typeFromBody).includes('punto') ? 'punto_interes' : 'servicio';
        const emoji = emojiFromBody || '\u{1F4CD}';
        let lat = -33.48942;
        let lng = -70.6567;

        const coordinateMatch =
            locationFromBody.match(/(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/) ||
            ticket.description.match(/(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);

        if (coordinateMatch && coordinateMatch.length >= 3) {
            const parsedLat = parseFloat(coordinateMatch[1]);
            const parsedLng = parseFloat(coordinateMatch[2]);
            if (Number.isFinite(parsedLat) && Number.isFinite(parsedLng)) {
                lat = parsedLat;
                lng = parsedLng;
            }
        }

        try {
            if (!organizationId) {
                throw new Error('No se pudo identificar la organizacion.');
            }

            await poiService.createPoi({
                organization_id: organizationId,
                name: title,
                description,
                category,
                latitude: lat,
                longitude: lng,
                location: {
                    latitude: lat,
                    longitude: lng,
                    lat,
                    lng,
                },
                emoji,
                created_by: user?.id,
            });

            await ticketService.setTicketStatus(ticket.id, 'resolved');
            await loadTicket();
            Alert.alert('Pin aprobado', 'El pin "' + title + '" fue agregado al mapa y la solicitud quedo resuelta.');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo guardar el pin en el servidor.');
        }
    };

    const addServicePin = async () => {
        try {
            if (!organizationId) {
                throw new Error('No se pudo identificar la organización.');
            }

            const lat = -33.48942 + (Math.random() - 0.5) * 0.004;
            const lng = -70.6567 + (Math.random() - 0.5) * 0.004;

            await poiService.createPoi({
                organization_id: organizationId,
                name: ticket.title,
                description: `${ticket.description.substring(0, 80)} - ${ticket.reporterName}`,
                category: 'servicio',
                latitude: lat,
                longitude: lng,
                emoji: '🔧',
                created_by: user?.id,
            });

            Alert.alert('Pin agregado', `"${ticket.title}" fue agregado al mapa del barrio.`);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo guardar el pin en el servidor.');
        }
    };

    const isClosed = ticket.rawStatus === 'resolved' || ticket.rawStatus === 'rejected';

    const handleReplyFocus = () => {
        setTimeout(() => {
            scrollRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    return (
        <SafeAreaView style={s.safe}>
            <KeyboardAvoidingView
                style={s.safe}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 24}
            >
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={s.scroll}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                >
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                        <Text style={s.backText}>← Volver</Text>
                    </TouchableOpacity>

                    <View style={[s.header, { marginBottom: 4 }]}>
                        <Text style={s.trackingCode}>#{ticket.trackingCode}</Text>
                    </View>

                    <View style={s.header}>
                        <Text style={s.title}>{ticket.title}</Text>
                        <View style={[s.badge, { backgroundColor: getStatusColor(ticket.status) }]}>
                            <Text style={s.badgeText}>{ticket.status}</Text>
                        </View>
                    </View>

                    <View style={s.infoRow}>
                        <Text style={s.info}>👤 {ticket.reporterName}</Text>
                        <Text style={s.info}>📅 {ticket.createdDateLabel}</Text>
                    </View>

                    <View style={s.descCard}>
                        <Text style={s.descLabel}>Descripción</Text>
                        <Text style={s.descText}>{ticket.description}</Text>
                    </View>

                    {ticket.attachmentUrl && (
                        <View style={s.imageContainer}>
                            <Text style={s.descLabel}>📷 Imagen adjunta</Text>
                            <Image source={{ uri: ticket.attachmentUrl }} style={s.image} resizeMode="cover" />
                        </View>
                    )}

                    {isAdminContext && (
                        <TouchableOpacity style={s.statusBtn} onPress={handleChangeStatus}>
                            <Text style={s.statusBtnText}>🔄 Cambiar estado</Text>
                        </TouchableOpacity>
                    )}

                    {isAdminContext && (ticket.title.startsWith('PIN:') || ticket.title.startsWith('📍 Pin:')) && !isClosed && (
                        <TouchableOpacity style={s.pinBtn} onPress={() => void approveMapPin()}>
                            <Text style={s.pinBtnText}>✅ Aprobar pin y marcar resuelta</Text>
                        </TouchableOpacity>
                    )}

                    {isAdminContext
                        && ['Servicio', 'Oficio', 'Emprendimiento', 'Servicio/Oficio/Emprendimiento'].some((value) => ticket.category.includes(value))
                        && !ticket.title.startsWith('PIN:') && !ticket.title.startsWith('📍 Pin:') && (
                        <TouchableOpacity style={s.pinBtn} onPress={() => void addServicePin()}>
                            <Text style={s.pinBtnText}>📍 Agregar como pin al mapa</Text>
                        </TouchableOpacity>
                    )}

                    <Text style={s.sectionTitle}>💬 Conversación</Text>
                    {comments.length === 0 ? (
                        <Text style={s.noReplies}>No hay mensajes aún.</Text>
                    ) : comments.map((comment) => (
                        <View key={comment.id} style={[s.replyCard, comment.from === 'admin' ? s.replyAdmin : s.replyUser]}>
                            <Text style={s.replyFrom}>{comment.from === 'admin' ? '🧑‍💼 Administración' : '👤 Vecino'}</Text>
                            <Text style={s.replyMsg}>{comment.body}</Text>
                            <Text style={s.replyDate}>{comment.createdDateLabel}</Text>
                        </View>
                    ))}

                    {isClosed ? (
                        <View style={s.closedBox}>
                            <Text style={s.closedText}>🔒 Esta solicitud está {ticket.status.toLowerCase()} y no admite más mensajes.</Text>
                        </View>
                    ) : (
                        <View style={s.replyBox}>
                            <TextInput
                                style={s.replyInput}
                                placeholder="Escribe una respuesta..."
                                placeholderTextColor="#94A3B8"
                                value={reply}
                                onChangeText={setReply}
                                onFocus={handleReplyFocus}
                                multiline
                            />
                            <TouchableOpacity style={s.sendBtn} onPress={() => void handleSendReply()} disabled={sending}>
                                <Text style={s.sendText}>{sending ? '...' : '➤'}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
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
    scroll: { padding: 20, paddingBottom: 28 },
    back: { marginBottom: 16 },
    backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    trackingCode: { fontSize: 13, fontWeight: 'bold', color: '#64748B' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1E3A5F', flex: 1, marginRight: 8 },
    badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
    infoRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    info: { fontSize: 13, color: '#64748B' },
    descCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1 },
    descLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
    descText: { fontSize: 15, color: '#0F172A', lineHeight: 22 },
    imageContainer: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1 },
    image: { width: '100%', height: 220, borderRadius: 10, marginTop: 4 },
    statusBtn: { backgroundColor: '#F59E0B', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
    statusBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 12 },
    noReplies: { color: '#94A3B8', fontSize: 14, marginBottom: 12 },
    replyCard: { borderRadius: 12, padding: 12, marginBottom: 8 },
    replyAdmin: { backgroundColor: '#EFF6FF', borderLeftWidth: 3, borderLeftColor: '#2563EB' },
    replyUser: { backgroundColor: '#F0FDF4', borderLeftWidth: 3, borderLeftColor: '#22C55E' },
    replyFrom: { fontSize: 12, fontWeight: 'bold', color: '#64748B', marginBottom: 4 },
    replyMsg: { fontSize: 14, color: '#0F172A', lineHeight: 20 },
    replyDate: { fontSize: 11, color: '#94A3B8', marginTop: 4, textAlign: 'right' },
    replyBox: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8, marginBottom: 16 },
    replyInput: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: '#0F172A',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        maxHeight: 100,
    },
    sendBtn: { backgroundColor: '#2563EB', borderRadius: 12, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    sendText: { fontSize: 20, color: '#FFFFFF', fontWeight: '700' },
    pinBtn: { backgroundColor: '#7C3AED', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
    pinBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
    closedBox: {
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
        marginBottom: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    closedText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
    noData: { fontSize: 16, color: '#94A3B8', textAlign: 'center', marginTop: 40 },
});
