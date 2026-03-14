import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { canManageMembers, getRoleLabel, GLOBAL_SUPERADMIN_EMAIL, Role, isAdminRole } from '../../lib/constants';
import { membershipService } from '../../services/membershipService';
import { accessRequestService, OrganizationMembershipRequest } from '../../services/accessRequestService';

const AVAILABLE_ROLES: Role[] = ['president', 'treasurer', 'secretary', 'director', 'member'];

export default function ManageMembersScreen({ navigation }: any) {
    const { organizationId, organizationName, user: currentUser, role } = useAuth();
    const members = useAppStore((state) => state.members);
    const setMembers = useAppStore((state) => state.setMembers);
    const [pendingRequests, setPendingRequests] = useState<OrganizationMembershipRequest[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [roleModalVisible, setRoleModalVisible] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState<any>(null);
    const [rejectingRequest, setRejectingRequest] = useState<OrganizationMembershipRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const canModerateMembers = canManageMembers(role);
    const canReviewRequests = isAdminRole(role);

    const subtitle = useMemo(() => {
        const activeMembers = members.filter((member) => member.active).length;
        const pendingCount = pendingRequests.length;
        if (pendingCount === 0) {
            return `${activeMembers} socio${activeMembers !== 1 ? 's' : ''} activo${activeMembers !== 1 ? 's' : ''}`;
        }
        return `${activeMembers} socio${activeMembers !== 1 ? 's' : ''} activo${activeMembers !== 1 ? 's' : ''} y ${pendingCount} solicitud${pendingCount !== 1 ? 'es' : ''} pendiente${pendingCount !== 1 ? 's' : ''}`;
    }, [members, pendingRequests]);

    const fetchData = useCallback(async () => {
        if (!organizationId) return;
        setLoading(true);
        try {
            const [memberRows, requestRows] = await Promise.all([
                membershipService.listOrganizationMembers(organizationId),
                canReviewRequests ? accessRequestService.listOrganizationMembershipRequests(organizationId) : Promise.resolve([]),
            ]);

            setMembers(memberRows.map((member) => ({
                id: member.user_id,
                name: member.full_name || 'Sin nombre',
                email: member.email || 'Sin email',
                role: member.role,
                active: member.is_active,
            })));
            setPendingRequests(requestRows);
        } catch (error: any) {
            Alert.alert('Error cargando socios', error.message);
        } finally {
            setLoading(false);
        }
    }, [canReviewRequests, organizationId, setMembers]);

    useFocusEffect(
        useCallback(() => {
            void fetchData();
        }, [fetchData]),
    );

    const toggleStatus = async (member: any) => {
        if (!organizationId || !canModerateMembers) return;
        const newStatus = !member.active;
        const previousMembers = [...members];
        setMembers(members.map((currentMember) => currentMember.id === member.id ? { ...currentMember, active: newStatus } : currentMember));

        try {
            await membershipService.setActiveStatus(organizationId, member.id, newStatus);
            Alert.alert('Exito', `Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente.`);
        } catch (error: any) {
            setMembers(previousMembers);
            Alert.alert('Error', error.message);
        }
    };

    const updateRole = async (userId: string, newRole: Role) => {
        if (!organizationId || !canModerateMembers) return;
        const previousMembers = [...members];
        setMembers(members.map((member) => member.id === userId ? { ...member, role: newRole } : member));

        try {
            await membershipService.updateRole(organizationId, userId, newRole);
            Alert.alert('Rol actualizado', `Se ha cambiado el rol a ${getRoleLabel(newRole)}.`);
        } catch (error: any) {
            setMembers(previousMembers);
            Alert.alert('Error', error.message);
        }
    };

    const handleMemberAction = (member: any) => {
        if (!member) return;

        if (!canModerateMembers) {
            Alert.alert(
                member.name,
                `Estado: ${member.active ? 'Activo' : 'Inactivo'}\nRol: ${getRoleLabel(member.role)}\nEmail: ${member.email}`,
            );
            return;
        }

        if (member.id === currentUser?.id) {
            Alert.alert('Accion no permitida', 'No puedes modificar tu propia membresia desde esta pantalla.');
            return;
        }

        if ((member.email || '').toLowerCase() === GLOBAL_SUPERADMIN_EMAIL) {
            Alert.alert('Accion no permitida', 'La cuenta superadmin global esta protegida.');
            return;
        }

        Alert.alert(
            `Gestionar: ${member.name}`,
            'Selecciona una accion:',
            [
                {
                    text: 'Ver detalle',
                    onPress: () => Alert.alert(
                        member.name,
                        `Estado: ${member.active ? 'Activo' : 'Inactivo'}\nRol: ${getRoleLabel(member.role)}\nEmail: ${member.email}`,
                    ),
                },
                {
                    text: 'Cambiar rol',
                    onPress: () => {
                        setMemberToEdit(member);
                        setRoleModalVisible(true);
                    },
                },
                {
                    text: member.active ? 'Desactivar' : 'Activar',
                    style: 'destructive',
                    onPress: () => { void toggleStatus(member); },
                },
                { text: 'Cancelar', style: 'cancel' },
            ],
        );
    };

    const handleApproveRequest = async (request: OrganizationMembershipRequest) => {
        try {
            await accessRequestService.approveMembershipRequest(request.id);
            Alert.alert('Solicitud aprobada', `${request.requestedFullName || request.requestedEmail} ya puede acceder a la app.`);
            await fetchData();
        } catch (error: any) {
            Alert.alert('No se pudo aprobar la solicitud', error.message);
        }
    };

    const handleRejectRequest = async () => {
        if (!rejectingRequest) return;
        try {
            await accessRequestService.rejectMembershipRequest(rejectingRequest.id, rejectionReason || null);
            Alert.alert('Solicitud rechazada', 'La solicitud fue rechazada correctamente.');
            setRejectingRequest(null);
            setRejectionReason('');
            await fetchData();
        } catch (error: any) {
            Alert.alert('No se pudo rechazar la solicitud', error.message);
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                    <Text style={s.backText}>Volver</Text>
                </TouchableOpacity>
                <Text style={s.title}>Socios y solicitudes</Text>
                <Text style={s.subtitle}>{subtitle}</Text>
                {organizationName && (
                    <Text style={s.currentOrg}>Organizacion activa: {organizationName}</Text>
                )}

                {loading && <ActivityIndicator color="#2563EB" style={{ marginBottom: 12 }} />}

                {canReviewRequests && (
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>Solicitudes pendientes</Text>
                        <Text style={s.sectionSubtitle}>
                            Solo los usuarios aprobados pueden entrar a la app JJVV.
                        </Text>

                        {pendingRequests.length === 0 ? (
                            <View style={s.emptyCard}>
                                <Text style={s.emptyText}>No hay solicitudes pendientes para esta organizacion.</Text>
                            </View>
                        ) : (
                            pendingRequests.map((request) => (
                                <View key={request.id} style={s.requestCard}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={s.requestName}>{request.requestedFullName || 'Sin nombre informado'}</Text>
                                        <Text style={s.requestEmail}>{request.requestedEmail}</Text>
                                        <Text style={s.requestMeta}>
                                            Solicitud enviada el {new Date(request.createdAt).toLocaleDateString('es-CL')}
                                        </Text>
                                    </View>
                                    <View style={s.requestActions}>
                                        <TouchableOpacity style={s.approveBtn} onPress={() => void handleApproveRequest(request)}>
                                            <Text style={s.approveBtnText}>Aprobar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={s.rejectBtn}
                                            onPress={() => {
                                                setRejectingRequest(request);
                                                setRejectionReason('');
                                            }}
                                        >
                                            <Text style={s.rejectBtnText}>Rechazar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                )}

                <View style={s.section}>
                    <Text style={s.sectionTitle}>Socios actuales</Text>
                    {!canModerateMembers && (
                        <Text style={s.sectionSubtitle}>
                            Puedes revisar las solicitudes y el padrón, pero los cambios de rol o activación están reservados a presidencia.
                        </Text>
                    )}

                    {members.map((member) => (
                        <TouchableOpacity
                            key={member.id}
                            style={[s.card, selected === member.id && s.cardSelected]}
                            onPress={() => setSelected(member.id === selected ? null : member.id)}
                            activeOpacity={0.7}
                        >
                            <View style={s.avatar}>
                                <Text style={s.avatarText}>{member.name[0]}</Text>
                            </View>
                            <View style={s.info}>
                                <Text style={s.memberName}>{member.name}</Text>
                                <Text style={s.memberEmail}>{member.email}</Text>
                                <View style={s.badges}>
                                    <View style={[s.badge, { backgroundColor: '#EFF6FF' }]}>
                                        <Text style={[s.badgeText, { color: '#2563EB' }]}>{getRoleLabel(member.role as Role)}</Text>
                                    </View>
                                    <View style={[s.badge, { backgroundColor: member.active ? '#F0FDF4' : '#FEF2F2' }]}>
                                        <Text style={[s.badgeText, { color: member.active ? '#22C55E' : '#EF4444' }]}>
                                            {member.active ? 'Activo' : 'Inactivo'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}

                    {selected && (
                        <View style={s.actions}>
                            <TouchableOpacity
                                style={[s.actionBtn, { backgroundColor: '#2563EB' }]}
                                onPress={() => handleMemberAction(members.find((member) => member.id === selected))}
                                disabled={members.find((member) => member.id === selected)?.id === currentUser?.id && canModerateMembers}
                            >
                                <Text style={s.actionBtnText}>
                                    {canModerateMembers ? 'Gestionar socio' : 'Ver detalle'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </ScrollView>

            <Modal visible={roleModalVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={s.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setRoleModalVisible(false)}
                >
                    <View style={s.modalContent} onStartShouldSetResponder={() => true}>
                        <Text style={s.modalTitle}>Seleccionar nuevo rol</Text>
                        <Text style={s.modalSubtitle}>Asignar rol a: {memberToEdit?.name}</Text>

                        <View style={s.roleGrid}>
                            {AVAILABLE_ROLES.map((nextRole) => (
                                <TouchableOpacity
                                    key={nextRole}
                                    style={[s.roleOption, memberToEdit?.role === nextRole && s.roleOptionActive]}
                                    onPress={() => {
                                        void updateRole(memberToEdit.id, nextRole);
                                        setRoleModalVisible(false);
                                    }}
                                >
                                    <View style={s.roleDot} />
                                    <Text style={[s.roleOptionText, memberToEdit?.role === nextRole && s.roleOptionTextActive]}>
                                        {getRoleLabel(nextRole)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            style={s.modalCloseBtn}
                            onPress={() => setRoleModalVisible(false)}
                        >
                            <Text style={s.modalCloseBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <Modal visible={Boolean(rejectingRequest)} transparent animationType="fade">
                <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setRejectingRequest(null)}>
                    <View style={s.modalContent} onStartShouldSetResponder={() => true}>
                        <Text style={s.modalTitle}>Rechazar solicitud</Text>
                        <Text style={s.modalSubtitle}>
                            Puedes ingresar un motivo opcional para informar al solicitante.
                        </Text>
                        <TextInput
                            style={s.reasonInput}
                            multiline
                            numberOfLines={4}
                            placeholder="Motivo del rechazo (opcional)"
                            placeholderTextColor="#94A3B8"
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                        />
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#DC2626' }]} onPress={() => void handleRejectRequest()}>
                            <Text style={s.actionBtnText}>Confirmar rechazo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.modalCloseBtn} onPress={() => setRejectingRequest(null)}>
                            <Text style={s.modalCloseBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 20 },
    back: { marginBottom: 16 },
    backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },
    currentOrg: { fontSize: 13, color: '#2563EB', marginTop: -12, marginBottom: 16, fontWeight: '600' },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
    sectionSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 12, lineHeight: 18 },
    emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
    emptyText: { fontSize: 14, color: '#64748B' },
    requestCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 1,
    },
    requestName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    requestEmail: { fontSize: 13, color: '#475569', marginTop: 4 },
    requestMeta: { fontSize: 12, color: '#94A3B8', marginTop: 6 },
    requestActions: { width: 100, gap: 8 },
    approveBtn: {
        backgroundColor: '#22C55E',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
    },
    approveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
    rejectBtn: {
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    rejectBtnText: { color: '#B91C1C', fontWeight: '700', fontSize: 13 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    cardSelected: { borderWidth: 2, borderColor: '#2563EB' },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1E3A5F', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
    info: { flex: 1 },
    memberName: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
    memberEmail: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    badges: { flexDirection: 'row', gap: 6, marginTop: 6 },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    actions: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginTop: 8, elevation: 2, gap: 8 },
    actionBtn: { borderRadius: 10, padding: 12, alignItems: 'center' },
    actionBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        elevation: 5,
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 4 },
    modalSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 20, lineHeight: 20 },
    roleGrid: { width: '100%', gap: 8, marginBottom: 20 },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    roleOptionActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
    roleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB', marginRight: 12 },
    roleOptionText: { fontSize: 15, color: '#334155', fontWeight: '500' },
    roleOptionTextActive: { color: '#1D4ED8', fontWeight: '600' },
    modalCloseBtn: {
        width: '100%',
        padding: 14,
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        marginTop: 12,
    },
    modalCloseBtnText: { color: '#64748B', fontWeight: 'bold', fontSize: 15 },
    reasonInput: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 14,
        minHeight: 110,
        textAlignVertical: 'top',
        color: '#0F172A',
        marginBottom: 8,
    },
});
