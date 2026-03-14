import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { formatCLP, useAppStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { DueItem, duesService } from '../../services/duesService';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function DuesScreen({ navigation }: any) {
    const { organizationId, user } = useAuth();
    const setMemberDues = useAppStore((state) => state.setMemberDues);
    const [dues, setDues] = useState<DueItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDue, setSelectedDue] = useState<DueItem | null>(null);

    const loadDues = useCallback(async () => {
        if (!organizationId || !user) {
            setDues([]);
            setMemberDues([]);
            return;
        }

        setLoading(true);
        try {
            const data = await duesService.getMyDues(organizationId, user.id);
            const userName = user.user_metadata?.full_name || user.email || 'Vecino';
            const enriched = data.map((due) => ({ ...due, memberName: userName }));
            setDues(enriched);
            setMemberDues(enriched.map((due) => ({
                id: due.id,
                memberId: due.memberId,
                memberName: due.memberName,
                month: due.month,
                year: due.year,
                amount: due.amount,
                status: due.status,
                paidDate: due.paidDate,
                receiptUri: due.proofUrl || due.proofPath || undefined,
                rejectionReason: due.rejectionReason || undefined,
                adminComment: due.rejectionComment || undefined,
                voucherId: due.voucherId,
            })));
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudieron cargar tus cuotas.');
        } finally {
            setLoading(false);
        }
    }, [organizationId, setMemberDues, user]);

    useEffect(() => {
        void loadDues();
    }, [loadDues]);

    const myDues = useMemo(
        () => dues.filter((due) => due.year === selectedYear).sort((left, right) => left.month - right.month),
        [dues, selectedYear]
    );

    const pendingCount = myDues.filter((due) => ['pending', 'overdue', 'REJECTED'].includes(due.status)).length;

    const getInfo = (status: DueItem['status']) => {
        switch (status) {
            case 'paid':
                return { label: 'Pagada', color: '#22C55E', bg: '#F0FDF4' };
            case 'pending':
                return { label: 'Por pagar', color: '#F59E0B', bg: '#FFFBEB' };
            case 'overdue':
                return { label: 'Atrasada', color: '#EF4444', bg: '#FEF2F2' };
            case 'PENDING_VALIDATION':
                return { label: 'En revision', color: '#3B82F6', bg: '#EFF6FF' };
            case 'REJECTED':
                return { label: 'Pago rechazado', color: '#B91C1C', bg: '#FEF2F2' };
            default:
                return { label: '', color: '#94A3B8', bg: '#F8FAFC' };
        }
    };

    const handleUpload = async () => {
        if (!selectedDue || !organizationId || !user) {
            return;
        }

        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });

            if (result.canceled || result.assets.length === 0) {
                return;
            }

            const file = result.assets[0];
            const proofPath = await duesService.uploadProof({
                organizationId,
                userId: user.id,
                ledgerId: selectedDue.id,
                fileName: file.name,
                fileUri: file.uri,
                mimeType: file.mimeType,
            });

            await duesService.submitProof(selectedDue.id, proofPath);
            setSelectedDue(null);
            await loadDues();
            Alert.alert('Comprobante enviado', 'La tesoreria revisara tu pago.');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo subir el comprobante.');
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                    <Text style={s.backText}>Volver</Text>
                </TouchableOpacity>
                <Text style={s.title}>Mis Cuotas</Text>

                <View style={s.yearSelector}>
                    <TouchableOpacity onPress={() => setSelectedYear((year) => year - 1)} style={s.arrowButton}>
                        <Text style={s.arrowText}>{'<'}</Text>
                    </TouchableOpacity>
                    <Text style={s.yearText}>{selectedYear}</Text>
                    <TouchableOpacity onPress={() => setSelectedYear((year) => year + 1)} style={s.arrowButton}>
                        <Text style={s.arrowText}>{'>'}</Text>
                    </TouchableOpacity>
                </View>

                {pendingCount > 0 && (
                    <View style={s.alertCard}>
                        <Text style={s.alertText}>
                            Tienes {pendingCount} cuota{pendingCount > 1 ? 's' : ''} pendiente{pendingCount > 1 ? 's' : ''} en {selectedYear}
                        </Text>
                    </View>
                )}

                {loading ? (
                    <View style={s.empty}>
                        <Text style={s.emptyText}>Cargando cuotas...</Text>
                    </View>
                ) : myDues.length === 0 ? (
                    <View style={s.empty}>
                        <Text style={s.emptyText}>No hay cuotas registradas para {selectedYear}</Text>
                    </View>
                ) : myDues.map((due) => {
                    const info = getInfo(due.status);
                    const canPay = ['pending', 'overdue', 'REJECTED'].includes(due.status);

                    return (
                        <TouchableOpacity
                            key={due.id}
                            style={[s.card, { borderLeftColor: info.color }]}
                            onPress={() => canPay && setSelectedDue(due)}
                            disabled={!canPay}
                            activeOpacity={0.7}
                        >
                            <View style={s.row}>
                                <Text style={s.month}>{MONTHS[due.month - 1]} {due.year}</Text>
                                <Text style={[s.amount, { color: info.color }]}>{formatCLP(due.amount)}</Text>
                            </View>

                            {due.status === 'REJECTED' && due.rejectionReason && (
                                <View style={s.rejectBox}>
                                    <Text style={s.rejectTitle}>Motivo: {due.rejectionReason}</Text>
                                    {due.rejectionComment && <Text style={s.rejectComment}>{due.rejectionComment}</Text>}
                                </View>
                            )}

                            <View style={s.footerRow}>
                                <View style={[s.statusBadge, { backgroundColor: info.bg }]}>
                                    <Text style={[s.statusText, { color: info.color }]}>{info.label}</Text>
                                </View>
                                {canPay ? (
                                    <Text style={s.payButtonText}>Subir comprobante</Text>
                                ) : due.status === 'paid' ? (
                                    <TouchableOpacity onPress={() => navigation.navigate('Voucher', { dueId: due.id })}>
                                        <Text style={s.voucherButtonText}>Ver comprobante</Text>
                                    </TouchableOpacity>
                                ) : null}
                            </View>

                            {due.paidDate && <Text style={s.paidDate}>Pagada el {due.paidDate}</Text>}
                        </TouchableOpacity>
                    );
                })}

                {selectedDue && (
                    <View style={s.modalOverlay}>
                        <View style={s.modalContent}>
                            <Text style={s.modalTitle}>Pagar cuota {MONTHS[selectedDue.month - 1]} {selectedDue.year}</Text>
                            <Text style={s.modalBankDetails}>
                                Transferir {formatCLP(selectedDue.amount)} a:
                                {'\n'}Banco Estado
                                {'\n'}Cuenta RUT: 12.345.678-9
                                {'\n'}jjvv@ejemplo.cl
                            </Text>
                            <TouchableOpacity style={s.uploadButton} onPress={() => void handleUpload()}>
                                <Text style={s.uploadButtonText}>Adjuntar comprobante</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.cancelButton} onPress={() => setSelectedDue(null)}>
                                <Text style={s.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 20 },
    back: { marginBottom: 16 },
    backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 16 },
    yearSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
        elevation: 2,
    },
    arrowButton: { padding: 8 },
    arrowText: { fontSize: 18, color: '#2563EB', fontWeight: 'bold' },
    yearText: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F' },
    alertCard: {
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    alertText: { color: '#991B1B', fontWeight: '600', fontSize: 14 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        borderLeftWidth: 4,
        elevation: 1,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    month: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
    amount: { fontSize: 16, fontWeight: 'bold' },
    statusBadge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 12, fontWeight: '600' },
    paidDate: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 16, color: '#94A3B8' },
    footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    payButtonText: { color: '#2563EB', fontSize: 13, fontWeight: '600' },
    voucherButtonText: { color: '#059669', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
    rejectBox: {
        backgroundColor: '#FEF2F2',
        padding: 8,
        borderRadius: 6,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    rejectTitle: { color: '#991B1B', fontWeight: 'bold', fontSize: 13 },
    rejectComment: { color: '#B91C1C', fontSize: 12, marginTop: 2 },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, elevation: 5 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 12 },
    modalBankDetails: {
        fontSize: 14,
        color: '#475569',
        lineHeight: 22,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    uploadButton: { backgroundColor: '#3B82F6', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
    uploadButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
    cancelButton: { padding: 14, alignItems: 'center' },
    cancelButtonText: { color: '#64748B', fontSize: 15, fontWeight: '600' },
});
