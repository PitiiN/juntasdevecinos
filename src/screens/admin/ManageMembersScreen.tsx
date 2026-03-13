import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, Modal } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Role } from '../../lib/constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';

export default function ManageMembersScreen({ navigation }: any) {
    const { organizationId, user: currentUser } = useAuth();
    const members = useAppStore(s => s.members);
    const setMembers = useAppStore(s => s.setMembers);
    const [selected, setSelected] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [roleModalVisible, setRoleModalVisible] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState<any>(null);

    React.useEffect(() => {
        if (organizationId) {
            fetchMembers();
        }
    }, [organizationId]);

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('memberships')
                .select(`
                    role,
                    is_active,
                    user_id,
                    profile:profiles(full_name, email)
                `)
                .eq('organization_id', organizationId);

            if (error) throw error;

            const formattedMembers = (data as any[]).map(m => ({
                id: m.user_id,
                name: m.profile?.full_name || 'Sin nombre',
                email: m.profile?.email || 'Sin email',
                role: m.role,
                active: m.is_active
            }));

            setMembers(formattedMembers);
        } catch (err: any) {
            Alert.alert('Error cargando socios', err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (member: any) => {
        // Bloquear gestión del Superadmin
        if (member.email === 'javier.aravena25@gmail.com') {
            Alert.alert('Acceso Restringido', 'El rol de Superadmin no puede ser modificado por seguridad.');
            return;
        }

        Alert.alert(
            `Gestionar: ${member.name}`,
            'Selecciona una acción:',
            [
                { text: 'Ver detalle', onPress: () => Alert.alert(member.name, `Socio activo\nRol: ${member.role}\nEmail: ${member.email}`) },
                { text: 'Cambiar rol', onPress: () => {
                    setMemberToEdit(member);
                    setRoleModalVisible(true);
                }},
                { text: member.active ? 'Desactivar' : 'Activar', style: 'destructive', onPress: () => toggleStatus(member) },
                { text: 'Cancelar', style: 'cancel' },
            ]
        );
    };

    const toggleStatus = async (member: any) => {
        const newStatus = !member.active;
        
        // Optimistic update
        const previousMembers = [...members];
        setMembers(members.map(m => m.id === member.id ? { ...m, active: newStatus } : m));

        try {
            const { error } = await supabase
                .from('memberships')
                .update({ is_active: newStatus })
                .eq('user_id', member.id);
            
            if (error) throw error;
            Alert.alert('Éxito', `Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente.`);
        } catch (err: any) {
            setMembers(previousMembers); // Rollback
            Alert.alert('Error', err.message);
        }
    };

    const showRoleSelector = (member: any) => {
        setMemberToEdit(member);
        setRoleModalVisible(true);
    };

    const updateRole = async (userId: string, newRole: Role) => {
        // Optimistic update
        const previousMembers = [...members];
        setMembers(members.map(m => m.id === userId ? { ...m, role: newRole } : m));

        try {
            const { error } = await supabase
                .from('memberships')
                .update({ role: newRole })
                .eq('user_id', userId);
            
            if (error) throw error;
            Alert.alert('✅ Rol actualizado', `Se ha cambiado el rol a ${newRole}.`);
        } catch (err: any) {
            setMembers(previousMembers); // Rollback
            Alert.alert('Error', err.message);
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Text style={s.backText}>← Volver</Text></TouchableOpacity>
                <Text style={s.title}>👥 Gestionar Socios</Text>
                <Text style={s.subtitle}>{members.length} socio{members.length !== 1 ? 's' : ''} registrado{members.length !== 1 ? 's' : ''}</Text>
                {loading && <ActivityIndicator color="#2563EB" style={{ marginBottom: 12 }} />}

                {members.map(m => (
                    <TouchableOpacity key={m.id} style={[s.card, selected === m.id && s.cardSelected]} onPress={() => { setSelected(m.id === selected ? null : m.id); }} activeOpacity={0.7}>
                        <View style={s.avatar}><Text style={s.avatarText}>{m.name[0]}</Text></View>
                        <View style={s.info}>
                            <Text style={s.memberName}>{m.name}</Text>
                            <Text style={s.memberEmail}>{m.email}</Text>
                            <View style={s.badges}>
                                <View style={[s.badge, { backgroundColor: '#EFF6FF' }]}><Text style={[s.badgeText, { color: '#2563EB' }]}>{m.role}</Text></View>
                                <View style={[s.badge, { backgroundColor: m.active ? '#F0FDF4' : '#FEF2F2' }]}>
                                    <Text style={[s.badgeText, { color: m.active ? '#22C55E' : '#EF4444' }]}>{m.active ? 'Activo' : 'Inactivo'}</Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}

                {selected && (
                    <View style={s.actions}>
                        <TouchableOpacity 
                            style={[s.actionBtn, { backgroundColor: '#2563EB' }]} 
                            onPress={() => handleAction(members.find(m => m.id === selected))}
                            disabled={members.find(m => m.id === selected)?.email === 'javier.aravena25@gmail.com'}
                        >
                            <Text style={s.actionBtnText}>
                                {members.find(m => m.id === selected)?.email === 'javier.aravena25@gmail.com' 
                                    ? '🔒 Superadmin Protegido' 
                                    : '⚙️ Gestionar Socio'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Custom Role Selector Modal */}
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
                            {['presidente', 'director', 'tesorero', 'secretario', 'moderador', 'socio'].map((r) => (
                                <TouchableOpacity 
                                    key={r} 
                                    style={[s.roleOption, memberToEdit?.role === r && s.roleOptionActive]}
                                    onPress={() => {
                                        updateRole(memberToEdit.id, r as Role);
                                        setRoleModalVisible(false);
                                    }}
                                >
                                    <View style={s.roleDot} />
                                    <Text style={[s.roleOptionText, memberToEdit?.role === r && s.roleOptionTextActive]}>
                                        {r.charAt(0).toUpperCase() + r.slice(1)}
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
    // Custom Modal Styles
    modalOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 24 
    },
    modalContent: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: 24, 
        padding: 24, 
        width: '100%', 
        maxWidth: 400,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    modalTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#1E3A5F', 
        marginBottom: 4 
    },
    modalSubtitle: { 
        fontSize: 14, 
        color: '#64748B', 
        marginBottom: 20 
    },
    roleGrid: { 
        width: '100%', 
        gap: 8,
        marginBottom: 20
    },
    roleOption: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 14, 
        borderRadius: 12, 
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    roleOptionActive: { 
        backgroundColor: '#EFF6FF', 
        borderColor: '#3B82F6' 
    },
    roleDot: { 
        width: 8, 
        height: 8, 
        borderRadius: 4, 
        backgroundColor: '#2563EB', 
        marginRight: 12 
    },
    roleOptionText: { 
        fontSize: 15, 
        color: '#334155', 
        fontWeight: '500' 
    },
    roleOptionTextActive: { 
        color: '#1D4ED8', 
        fontWeight: '600' 
    },
    modalCloseBtn: { 
        width: '100%', 
        padding: 14, 
        alignItems: 'center', 
        backgroundColor: '#F1F5F9', 
        borderRadius: 12 
    },
    modalCloseBtnText: { 
        color: '#64748B', 
        fontWeight: 'bold', 
        fontSize: 15 
    },
});
