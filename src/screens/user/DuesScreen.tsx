import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useAppStore, formatCLP } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function DuesScreen({ navigation }: any) {
    const { user } = useAuth();
    const memberDues = useAppStore(s => s.memberDues);
    const submitDueReceipt = useAppStore(s => s.submitDueReceipt);

    const [selectedYear, setSelectedYear] = useState(2026);
    const [selectedDue, setSelectedDue] = useState<any>(null);

    const userName = user?.user_metadata?.full_name || '';
    const myDues = memberDues.filter(d => d.memberName === userName && d.year === selectedYear);

    // We count all non-paid ones as "pending" for the top alert, except PENDING_VALIDATION which are in progress.
    const pendingCount = myDues.filter(d => ['pending', 'overdue', 'REJECTED'].includes(d.status)).length;

    const getInfo = (status: string) => {
        switch (status) {
            case 'paid': return { label: 'Pagada', color: '#22C55E', bg: '#F0FDF4', icon: '✅' };
            case 'pending': return { label: 'Por Pagar', color: '#F59E0B', bg: '#FFFBEB', icon: '⏳' };
            case 'overdue': return { label: 'Atrasada', color: '#EF4444', bg: '#FEF2F2', icon: '⚠️' };
            case 'PENDING_VALIDATION': return { label: 'En revisión admin', color: '#3B82F6', bg: '#EFF6FF', icon: '🔍' };
            case 'REJECTED': return { label: 'Pago Rechazado', color: '#B91C1C', bg: '#FEF2F2', icon: '❌' };
            default: return { label: '', color: '#94A3B8', bg: '#F8FAFC', icon: '' };
        }
    };

    const handleUpload = async () => {
        if (!selectedDue) return;
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                submitDueReceipt(selectedDue.id, file.uri);
                setSelectedDue(null);
                Alert.alert('Comprobante Enviado', 'El administrador revisará tu comprobante a la brevedad.');
            }
        } catch (error) {
            console.error('Error al cargar documento:', error);
            Alert.alert('Error', 'No se pudo seleccionar el comprobante.');
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Text style={s.backText}>← Volver</Text></TouchableOpacity>
                <Text style={s.title}>💸 Mis Cuotas</Text>

                <View style={s.yearSelector}>
                    <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)} style={s.arrowBtn}><Text style={s.arrowText}>◀</Text></TouchableOpacity>
                    <Text style={s.yearText}>📅 {selectedYear}</Text>
                    <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)} style={s.arrowBtn}><Text style={s.arrowText}>▶</Text></TouchableOpacity>
                </View>

                {pendingCount > 0 && (
                    <View style={s.alertCard}><Text style={s.alertText}>⚠️ Tienes {pendingCount} cuota{pendingCount > 1 ? 's' : ''} por pagar en {selectedYear}</Text></View>
                )}

                {myDues.length === 0 ? (
                    <View style={s.empty}><Text style={s.emptyText}>No hay cuotas registradas para {selectedYear}</Text></View>
                ) : myDues.sort((a, b) => a.month - b.month).map(d => {
                    const info = getInfo(d.status);
                    const canPay = ['pending', 'overdue', 'REJECTED'].includes(d.status);

                    return (
                        <TouchableOpacity
                            key={d.id}
                            style={[s.card, { borderLeftColor: info.color }]}
                            onPress={() => canPay && setSelectedDue(d)}
                            disabled={!canPay}
                            activeOpacity={0.7}
                        >
                            <View style={s.row}>
                                <Text style={s.month}>{info.icon} {MONTHS[d.month - 1]} {d.year}</Text>
                                <Text style={[s.amount, { color: info.color }]}>{formatCLP(d.amount)}</Text>
                            </View>

                            {d.status === 'REJECTED' && d.rejectionReason && (
                                <View style={s.rejectBox}>
                                    <Text style={s.rejectTitle}>Motivo Rechazo: {d.rejectionReason}</Text>
                                    {d.adminComment && <Text style={s.rejectComment}>{d.adminComment}</Text>}
                                </View>
                            )}

                            <View style={s.footerRow}>
                                <View style={[s.statusBadge, { backgroundColor: info.bg }]}><Text style={[s.statusText, { color: info.color }]}>{info.label}</Text></View>
                                {canPay && <Text style={s.payBtnText}>Subir Comprobante 📤</Text>}
                            </View>

                            {d.paidDate && <Text style={s.paidDate}>Pagada el {d.paidDate}</Text>}
                        </TouchableOpacity>
                    );
                })}

                {selectedDue && (
                    <View style={s.modalOverlay}>
                        <View style={s.modalContent}>
                            <Text style={s.modalTitle}>Pagar Cuota {MONTHS[selectedDue.month - 1]} {selectedDue.year}</Text>
                            <Text style={s.modalBankDetails}>
                                Transferir {formatCLP(selectedDue.amount)} a:{'\n'}
                                Banco Estado{'\n'}
                                Cuenta RUT: 12.345.678-9{'\n'}
                                jjvv@ejemplo.cl
                            </Text>
                            <TouchableOpacity style={s.uploadBtn} onPress={handleUpload}>
                                <Text style={s.uploadBtnText}>📸 Adjuntar Comprobante</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.cancelBtn} onPress={() => setSelectedDue(null)}>
                                <Text style={s.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' }, scroll: { padding: 20 },
    back: { marginBottom: 16 }, backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 16 },
    yearSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginBottom: 16, elevation: 2 },
    arrowBtn: { padding: 8 }, arrowText: { fontSize: 18, color: '#2563EB', fontWeight: 'bold' },
    yearText: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F' },
    alertCard: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FECACA' },
    alertText: { color: '#991B1B', fontWeight: '600', fontSize: 14 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8, borderLeftWidth: 4, elevation: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    month: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
    amount: { fontSize: 16, fontWeight: 'bold' },
    statusBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 12, fontWeight: '600' },
    paidDate: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 16, color: '#94A3B8' },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    payBtnText: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
    rejectBox: { backgroundColor: '#FEF2F2', padding: 8, borderRadius: 6, marginTop: 8, borderWidth: 1, borderColor: '#FECACA' },
    rejectTitle: { color: '#991B1B', fontWeight: 'bold', fontSize: 13 },
    rejectComment: { color: '#B91C1C', fontSize: 12, marginTop: 2 },
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, elevation: 5 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 12 },
    modalBankDetails: { fontSize: 14, color: '#475569', lineHeight: 22, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
    uploadBtn: { backgroundColor: '#3B82F6', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
    uploadBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
    cancelBtn: { padding: 14, alignItems: 'center' },
    cancelText: { color: '#64748B', fontSize: 15, fontWeight: '600' },
});
