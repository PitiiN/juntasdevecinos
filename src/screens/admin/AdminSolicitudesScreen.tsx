import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { ticketService, TicketItem } from '../../services/ticketService';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const YEARS: number[] = [];
for (let year = 2000; year <= 2040; year += 1) {
    YEARS.push(year);
}

export default function AdminSolicitudesScreen() {
    const navigation = useNavigation<any>();
    const { organizationId } = useAuth();
    const now = new Date();
    const [tickets, setTickets] = useState<TicketItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [showYearPicker, setShowYearPicker] = useState(false);
    const yearScrollRef = useRef<ScrollView>(null);

    const loadTickets = useCallback(async () => {
        if (!organizationId) {
            setTickets([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await ticketService.getOrganizationTickets(organizationId);
            setTickets(data);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudieron cargar las solicitudes.');
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

    const filtered = tickets.filter((ticket) => {
        const createdAt = new Date(ticket.createdAt);
        return createdAt.getMonth() === selectedMonth && createdAt.getFullYear() === selectedYear;
    });

    const open = filtered.filter((ticket) => ticket.status === 'Abierta').length;
    const inProgress = filtered.filter((ticket) => ticket.status === 'En proceso').length;
    const resolved = filtered.filter((ticket) => ticket.status === 'Resuelta').length;

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <Text style={s.title}>📝 Solicitudes Recibidas</Text>

                <TouchableOpacity style={s.yearDropdown} onPress={() => setShowYearPicker(true)}>
                    <Text style={s.yearDropdownText}>📅 {selectedYear}</Text>
                    <Text style={s.yearDropdownArrow}>▾</Text>
                </TouchableOpacity>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.monthScroll}>
                    {MONTHS.map((month, index) => (
                        <TouchableOpacity
                            key={month}
                            style={[s.pill, selectedMonth === index && s.pillActive]}
                            onPress={() => setSelectedMonth(index)}
                        >
                            <Text style={[s.pillText, selectedMonth === index && s.pillTextActive]}>{month}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={s.stats}>
                    <View style={[s.stat, { backgroundColor: '#FEF2F2' }]}>
                        <Text style={s.statNum}>{open}</Text>
                        <Text style={s.statLabel}>Abiertas</Text>
                    </View>
                    <View style={[s.stat, { backgroundColor: '#FFFBEB' }]}>
                        <Text style={s.statNum}>{inProgress}</Text>
                        <Text style={s.statLabel}>En proceso</Text>
                    </View>
                    <View style={[s.stat, { backgroundColor: '#F0FDF4' }]}>
                        <Text style={s.statNum}>{resolved}</Text>
                        <Text style={s.statLabel}>Resueltas</Text>
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#1E3A5F" style={{ marginTop: 24 }} />
                ) : filtered.length === 0 ? (
                    <View style={s.empty}>
                        <Text style={s.emptyEmoji}>📭</Text>
                        <Text style={s.emptyText}>No hay solicitudes en {MONTHS[selectedMonth]} {selectedYear}</Text>
                    </View>
                ) : filtered.map((ticket) => (
                    <TouchableOpacity
                        key={ticket.id}
                        style={[s.card, ticket.isUnreadForAdmin && s.cardUnread]}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('AdminSolicitudDetail', { id: ticket.id, isAdmin: true })}
                    >
                        <View style={s.cardHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.trackingCode}>{ticket.trackingCode}</Text>
                                <Text style={s.cardTitle} numberOfLines={2}>{ticket.title}</Text>
                            </View>
                            <View style={[s.badge, { backgroundColor: getStatusColor(ticket.status) }]}>
                                <Text style={s.badgeText}>{ticket.status}</Text>
                            </View>
                        </View>
                        {ticket.category ? <Text style={s.category}>📋 {ticket.category}</Text> : null}
                        <Text style={s.desc} numberOfLines={2}>{ticket.description}</Text>
                        <View style={s.cardMeta}>
                            <Text style={s.user}>👤 {ticket.reporterName}</Text>
                            <Text style={s.date}>📅 {ticket.createdDateLabel}</Text>
                            {ticket.attachmentUrl && <Text style={s.img}>📷</Text>}
                            {ticket.replyCount > 0 && <Text style={s.replies}>💬 {ticket.replyCount}</Text>}
                            {ticket.isUnreadForAdmin && <View style={s.newDot} />}
                        </View>
                    </TouchableOpacity>
                ))}

                <TouchableOpacity
                    style={s.showAllBtn}
                    onPress={() => {
                        setSelectedMonth(now.getMonth());
                        setSelectedYear(now.getFullYear());
                    }}
                >
                    <Text style={s.showAllText}>🔄 Volver al mes actual</Text>
                </TouchableOpacity>

                <Modal visible={showYearPicker} transparent animationType="fade">
                    <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowYearPicker(false)}>
                        <View style={s.modalContent}>
                            <Text style={s.modalTitle}>Seleccionar Año</Text>
                            <ScrollView
                                style={{ maxHeight: 350 }}
                                ref={yearScrollRef}
                                onLayout={() => {
                                    const index = YEARS.indexOf(selectedYear);
                                    if (index >= 0 && yearScrollRef.current) {
                                        yearScrollRef.current.scrollTo({ y: Math.max(0, index * 50 - 100), animated: false });
                                    }
                                }}
                            >
                                {YEARS.map((year) => (
                                    <TouchableOpacity
                                        key={year}
                                        style={[s.yearOption, selectedYear === year && s.yearOptionActive]}
                                        onPress={() => {
                                            setSelectedYear(year);
                                            setShowYearPicker(false);
                                        }}
                                    >
                                        <Text style={[s.yearOptionText, selectedYear === year && s.yearOptionTextActive]}>{year}</Text>
                                        {selectedYear === year && <Text style={s.yearCheck}>✓</Text>}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
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
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 12 },
    yearDropdown: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 1,
        marginBottom: 8,
    },
    yearDropdownText: { fontSize: 16, fontWeight: '600', color: '#1E3A5F' },
    yearDropdownArrow: { fontSize: 16, color: '#94A3B8' },
    monthScroll: { marginBottom: 12 },
    pill: { backgroundColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginRight: 6 },
    pillActive: { backgroundColor: '#2563EB' },
    pillText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    pillTextActive: { color: '#FFFFFF' },
    stats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    stat: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center', marginHorizontal: 3, elevation: 1 },
    statNum: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
    statLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
    cardUnread: { borderWidth: 1, borderColor: '#C4B5FD' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    trackingCode: { fontSize: 10, fontWeight: 'bold', color: '#64748B', marginBottom: 2 },
    cardTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A', flex: 1, marginRight: 8 },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
    category: { fontSize: 12, color: '#7C3AED', fontWeight: '500', marginBottom: 4 },
    desc: { fontSize: 13, color: '#64748B', marginBottom: 6 },
    cardMeta: { flexDirection: 'row', alignItems: 'center' },
    user: { fontSize: 12, color: '#94A3B8', marginRight: 12 },
    date: { fontSize: 12, color: '#94A3B8', marginRight: 8 },
    img: { fontSize: 14, marginRight: 8 },
    replies: { fontSize: 12, color: '#2563EB', marginRight: 8 },
    newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7C3AED' },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 16, color: '#94A3B8', textAlign: 'center' },
    showAllBtn: { alignItems: 'center', padding: 12, marginTop: 8 },
    showAllText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 40 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 300 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F', textAlign: 'center', marginBottom: 12 },
    yearOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 10, marginBottom: 4 },
    yearOptionActive: { backgroundColor: '#EFF6FF' },
    yearOptionText: { fontSize: 18, fontWeight: '500', color: '#334155' },
    yearOptionTextActive: { color: '#2563EB', fontWeight: 'bold' },
    yearCheck: { fontSize: 18, color: '#2563EB', fontWeight: 'bold' },
});
