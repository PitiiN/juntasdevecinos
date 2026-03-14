import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { accessRequestService, JoinableOrganization } from '../../services/accessRequestService';
import { useAuth } from '../../context/AuthContext';

export default function PendingApprovalScreen() {
    const { user, pendingMembershipRequest, refreshSession, signOut, deleteAccount } = useAuth();
    const [organizations, setOrganizations] = useState<JoinableOrganization[]>([]);
    const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
    const [showOrgModal, setShowOrgModal] = useState(false);
    const [loadingOrganizations, setLoadingOrganizations] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        void loadOrganizations();
    }, []);

    useEffect(() => {
        if (pendingMembershipRequest?.organizationId) {
            setSelectedOrganizationId(pendingMembershipRequest.organizationId);
        }
    }, [pendingMembershipRequest]);

    const loadOrganizations = async () => {
        setLoadingOrganizations(true);
        try {
            const data = await accessRequestService.listJoinableOrganizations();
            setOrganizations(data);
        } catch (error: any) {
            Alert.alert('No se pudo cargar la lista de organizaciones', error?.message || 'Intentalo nuevamente.');
        } finally {
            setLoadingOrganizations(false);
        }
    };

    const selectedOrganization = useMemo(
        () => organizations.find((item) => item.id === selectedOrganizationId) || null,
        [organizations, selectedOrganizationId],
    );

    const statusTitle =
        pendingMembershipRequest?.status === 'rejected'
            ? 'Solicitud rechazada'
            : pendingMembershipRequest?.status === 'pending'
                ? 'Solicitud pendiente de aprobacion'
                : 'Aun no tienes acceso a una JJVV';

    const statusBody =
        pendingMembershipRequest?.status === 'rejected'
            ? `Tu solicitud a ${pendingMembershipRequest.organizationName} fue rechazada.${pendingMembershipRequest.rejectionReason ? ` Motivo: ${pendingMembershipRequest.rejectionReason}` : ''}`
            : pendingMembershipRequest?.status === 'pending'
                ? `Tu solicitud para unirte a ${pendingMembershipRequest.organizationName} fue enviada correctamente. Un administrador debe aprobarla antes de darte acceso a la app.`
                : 'Debes seleccionar una Junta de Vecinos y enviar una solicitud. Hasta que la aprueben no tendras acceso a las funciones comunitarias.';

    const submitRequest = async () => {
        if (!selectedOrganizationId) {
            Alert.alert('Selecciona una organizacion', 'Debes elegir la JJVV a la que deseas unirte.');
            return;
        }

        try {
            setSubmitting(true);
            await accessRequestService.requestMembership(selectedOrganizationId);
            await Promise.race([
                refreshSession(),
                new Promise((resolve) => setTimeout(resolve, 3000)),
            ]);
            Alert.alert(
                'Solicitud enviada',
                `Tu acceso quedo pendiente de aprobacion para ${selectedOrganization?.name || 'la organizacion seleccionada'}.`,
            );
            setShowOrgModal(false);
        } catch (error: any) {
            Alert.alert('No se pudo enviar la solicitud', error?.message || 'Intentalo nuevamente.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAccount = async () => {
        Alert.alert(
            'Eliminar cuenta',
            'Esta accion eliminara tu cuenta de la app. Solo continua si estas seguro.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAccount();
                        } catch (error: any) {
                            Alert.alert('No se pudo eliminar la cuenta', error?.message || 'Intentalo nuevamente.');
                        }
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <View style={s.hero}>
                    <Text style={s.title}>Acceso restringido hasta aprobacion</Text>
                    <Text style={s.subtitle}>{statusBody}</Text>
                    <Text style={s.meta}>Cuenta: {user?.email || 'Sin correo'}</Text>
                </View>

                <View style={s.card}>
                    <Text style={s.cardTitle}>{statusTitle}</Text>
                    <Text style={s.cardText}>
                        {pendingMembershipRequest
                            ? `Organizacion solicitada: ${pendingMembershipRequest.organizationName}`
                            : 'Todavia no has enviado una solicitud de ingreso.'}
                    </Text>
                    {pendingMembershipRequest?.createdAt && (
                        <Text style={s.helper}>
                            Solicitud registrada el {new Date(pendingMembershipRequest.createdAt).toLocaleDateString('es-CL')}
                        </Text>
                    )}
                </View>

                <TouchableOpacity style={s.primaryButton} onPress={() => setShowOrgModal(true)}>
                    <Text style={s.primaryButtonText}>
                        {pendingMembershipRequest?.status === 'pending' ? 'Cambiar solicitud' : 'Solicitar ingreso a una JJVV'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.secondaryButton} onPress={() => void refreshSession()}>
                    <Text style={s.secondaryButtonText}>Ya me aprobaron, actualizar acceso</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.secondaryButton} onPress={signOut}>
                    <Text style={s.secondaryButtonText}>Cerrar sesion</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.deleteButton} onPress={handleDeleteAccount}>
                    <Text style={s.deleteButtonText}>Eliminar mi cuenta</Text>
                </TouchableOpacity>
            </ScrollView>

            <Modal visible={showOrgModal} transparent animationType="fade">
                <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowOrgModal(false)}>
                    <View style={s.modalCard} onStartShouldSetResponder={() => true}>
                        <Text style={s.modalTitle}>Selecciona tu organizacion</Text>
                        <Text style={s.modalSubtitle}>
                            El administrador de esa JJVV debera aprobar tu ingreso antes de habilitar la app.
                        </Text>

                        {loadingOrganizations ? (
                            <ActivityIndicator color="#2563EB" style={{ marginVertical: 24 }} />
                        ) : (
                            <ScrollView style={s.orgList}>
                                {organizations.map((organization) => {
                                    const isSelected = organization.id === selectedOrganizationId;
                                    return (
                                        <TouchableOpacity
                                            key={organization.id}
                                            style={[s.orgOption, isSelected && s.orgOptionSelected]}
                                            onPress={() => setSelectedOrganizationId(organization.id)}
                                        >
                                            <View style={s.orgInfo}>
                                                <Text style={[s.orgName, isSelected && s.orgNameSelected]}>
                                                    {organization.name}
                                                </Text>
                                                <Text style={[s.orgLocation, isSelected && s.orgLocationSelected]}>
                                                    {[organization.commune, organization.region].filter(Boolean).join(' - ') || 'Sin ubicacion registrada'}
                                                </Text>
                                            </View>
                                            <Text style={[s.orgBadge, isSelected && s.orgBadgeSelected]}>
                                                {isSelected ? 'Elegida' : 'Elegir'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={[s.primaryButton, (!selectedOrganizationId || submitting) && s.disabledButton]}
                            onPress={() => void submitRequest()}
                            disabled={!selectedOrganizationId || submitting}
                        >
                            <Text style={s.primaryButtonText}>
                                {submitting ? 'Enviando...' : 'Enviar solicitud'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.modalCancel} onPress={() => setShowOrgModal(false)}>
                            <Text style={s.modalCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    hero: {
        backgroundColor: '#1E3A5F',
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
    },
    title: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
    subtitle: { fontSize: 15, color: '#E2E8F0', marginTop: 10, lineHeight: 22 },
    meta: { fontSize: 13, color: '#CBD5E1', marginTop: 14 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    cardText: { fontSize: 14, color: '#334155', marginTop: 8, lineHeight: 20 },
    helper: { fontSize: 12, color: '#64748B', marginTop: 10 },
    primaryButton: {
        backgroundColor: '#2563EB',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        marginBottom: 10,
    },
    primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
    secondaryButton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        marginBottom: 10,
    },
    secondaryButtonText: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
    deleteButton: {
        backgroundColor: '#FEF2F2',
        borderRadius: 14,
        paddingVertical: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    deleteButtonText: { color: '#B91C1C', fontSize: 15, fontWeight: '700' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'center',
        padding: 24,
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        maxHeight: '82%',
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
    modalSubtitle: { fontSize: 13, color: '#64748B', marginTop: 6, marginBottom: 14, lineHeight: 18 },
    orgList: { marginBottom: 16 },
    orgOption: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    orgOptionSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
    orgInfo: { flex: 1, marginRight: 8 },
    orgName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
    orgNameSelected: { color: '#1D4ED8' },
    orgLocation: { fontSize: 12, color: '#64748B', marginTop: 4 },
    orgLocationSelected: { color: '#2563EB' },
    orgBadge: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        backgroundColor: '#F1F5F9',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        overflow: 'hidden',
    },
    orgBadgeSelected: { color: '#FFFFFF', backgroundColor: '#2563EB' },
    modalCancel: { alignItems: 'center', paddingTop: 6 },
    modalCancelText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
    disabledButton: { opacity: 0.55 },
});
