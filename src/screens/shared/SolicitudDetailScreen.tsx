import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';

export default function SolicitudDetailScreen({ route, navigation }: any) {
    const { id, isAdmin } = route.params;
    const { solicitudes, updateSolicitudStatus, addSolicitudReply, markSolicitudSeen, addMapPin } = useAppStore();
    const solicitud = solicitudes.find(s => s.id === id);
    const [reply, setReply] = useState('');

    useEffect(() => {
        if (solicitud) markSolicitudSeen(id, isAdmin ? 'admin' : 'user');
    }, [id]);

    if (!solicitud) return <SafeAreaView style={s.safe}><Text style={s.noData}>Solicitud no encontrada</Text></SafeAreaView>;

    const getStatusColor = (st: string) => {
        switch (st) { case 'Abierta': return '#EF4444'; case 'En proceso': return '#F59E0B'; case 'Resuelta': return '#22C55E'; default: return '#94A3B8'; }
    };

    const handleChangeStatus = () => {
        Alert.alert('Cambiar estado', 'Selecciona el nuevo estado:', [
            { text: 'En Proceso', onPress: () => updateSolicitudStatus(id, 'En proceso') },
            { text: 'Resuelta', onPress: () => updateSolicitudStatus(id, 'Resuelta') },
            { text: 'Rechazada', onPress: () => updateSolicitudStatus(id, 'Rechazada') },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    };

    const handleSendReply = () => {
        if (!reply.trim()) return;
        addSolicitudReply(id, reply, isAdmin ? 'admin' : 'user');
        setReply('');
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Text style={s.backText}>← Volver</Text></TouchableOpacity>

                <View style={s.header}>
                    <Text style={s.title}>{solicitud.title}</Text>
                    <View style={[s.badge, { backgroundColor: getStatusColor(solicitud.status) }]}><Text style={s.badgeText}>{solicitud.status}</Text></View>
                </View>

                <View style={s.infoRow}>
                    <Text style={s.info}>👤 {solicitud.user}</Text>
                    <Text style={s.info}>📅 {solicitud.date}</Text>
                </View>

                <View style={s.descCard}>
                    <Text style={s.descLabel}>Descripción</Text>
                    <Text style={s.descText}>{solicitud.description}</Text>
                </View>

                {solicitud.hasImage && solicitud.imageUri && (
                    <View style={s.imageContainer}>
                        <Text style={s.descLabel}>📷 Imagen adjunta</Text>
                        <Image source={{ uri: solicitud.imageUri }} style={s.image} resizeMode="cover" />
                    </View>
                )}

                {isAdmin && (
                    <TouchableOpacity style={s.statusBtn} onPress={handleChangeStatus}>
                        <Text style={s.statusBtnText}>🔄 Cambiar Estado</Text>
                    </TouchableOpacity>
                )}

                {isAdmin && solicitud.title.startsWith('📍 Pin:') && solicitud.status !== 'Resuelta' && solicitud.status !== 'Rechazada' && (
                    <TouchableOpacity style={s.pinBtn} onPress={() => {
                        const titleMatch = solicitud.description.match(/Nombre: (.*)/);
                        const descMatch = solicitud.description.match(/Descripción: (.*)/);
                        const typeMatch = solicitud.description.match(/Tipo: (.*)/);
                        const locMatch = solicitud.description.match(/Ubicación: (.*), (.*)/);
                        const emojiMatch = solicitud.description.match(/Emoji: (.*)/);

                        const title = titleMatch ? titleMatch[1] : solicitud.title.replace('📍 Pin: ', '');
                        const description = descMatch ? descMatch[1] : '';
                        const category = typeMatch && typeMatch[1].includes('Punto de Interés') ? 'punto_interes' : 'servicio';
                        const emoji = emojiMatch ? emojiMatch[1] : '📍';
                        let lat = -33.4920, lng = -70.6610;

                        if (locMatch && locMatch.length >= 3) {
                            lat = parseFloat(locMatch[1]);
                            lng = parseFloat(locMatch[2]);
                        }

                        addMapPin({ title, description, category, lat, lng, emoji });
                        updateSolicitudStatus(solicitud.id, 'Resuelta');
                        Alert.alert('✅ Pin Aprobado y Agregado', `El pin "${title}" ha sido agregado al mapa y la solicitud ha sido resuelta.`);
                    }}>
                        <Text style={s.pinBtnText}>✅ Aprobar Pin y Marcar Resuelta</Text>
                    </TouchableOpacity>
                )}

                {isAdmin && solicitud.category && ['Servicio', 'Oficio', 'Emprendimiento', 'Servicio/Oficio/Emprendimiento'].some(c => solicitud.category.includes(c)) && !solicitud.title.startsWith('📍 Pin:') && (
                    <TouchableOpacity style={s.pinBtn} onPress={() => {
                        const lat = -33.4920 + (Math.random() - 0.5) * 0.004;
                        const lng = -70.6610 + (Math.random() - 0.5) * 0.004;
                        addMapPin({
                            title: solicitud.title,
                            description: `${solicitud.description.substring(0, 80)} — ${solicitud.user}`,
                            category: 'servicio',
                            lat, lng,
                            emoji: '🔧',
                        });
                        Alert.alert('✅ Pin agregado', `"${solicitud.title}" ha sido agregado al Mapa del Barrio.`);
                    }}>
                        <Text style={s.pinBtnText}>📍 Agregar como Pin al Mapa</Text>
                    </TouchableOpacity>
                )}

                <Text style={s.sectionTitle}>💬 Conversación</Text>
                {solicitud.replies.length === 0 ? (
                    <Text style={s.noReplies}>No hay mensajes aún</Text>
                ) : solicitud.replies.map(r => (
                    <View key={r.id} style={[s.replyCard, r.from === 'admin' ? s.replyAdmin : s.replyUser]}>
                        <Text style={s.replyFrom}>{r.from === 'admin' ? '👑 Administrador' : '👤 Vecino'}</Text>
                        <Text style={s.replyMsg}>{r.message}</Text>
                        <Text style={s.replyDate}>{r.date}</Text>
                    </View>
                ))}

                {(solicitud.status === 'Rechazada' || solicitud.status === 'Resuelta') ? (
                    <View style={s.closedBox}>
                        <Text style={s.closedText}>🔒 Esta solicitud está {solicitud.status.toLowerCase()} y no admite más mensajes.</Text>
                    </View>
                ) : (
                    <View style={s.replyBox}>
                        <TextInput style={s.replyInput} placeholder="Escribe una respuesta..." placeholderTextColor="#94A3B8" value={reply} onChangeText={setReply} multiline />
                        <TouchableOpacity style={s.sendBtn} onPress={handleSendReply}>
                            <Text style={s.sendText}>➤</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' }, scroll: { padding: 20 },
    back: { marginBottom: 16 }, backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1E3A5F', flex: 1, marginRight: 8 },
    badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }, badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
    infoRow: { flexDirection: 'row', gap: 16, marginBottom: 16 }, info: { fontSize: 13, color: '#64748B' },
    descCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1 },
    descLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 8 },
    descText: { fontSize: 15, color: '#0F172A', lineHeight: 22 },
    imageContainer: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1 },
    image: { width: '100%', height: 200, borderRadius: 10, marginTop: 4 },
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
    replyBox: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8, marginBottom: 40 },
    replyInput: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, fontSize: 15, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', maxHeight: 100 },
    sendBtn: { backgroundColor: '#2563EB', borderRadius: 12, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    sendText: { fontSize: 22, color: '#FFFFFF' },
    pinBtn: { backgroundColor: '#7C3AED', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 },
    pinBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
    closedBox: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, marginTop: 8, marginBottom: 40, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    closedText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
    noData: { fontSize: 16, color: '#94A3B8', textAlign: 'center', marginTop: 40 },
});
