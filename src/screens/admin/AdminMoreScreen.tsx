import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../lib/constants';

const canManageFinance = (role: Role | null) => role === 'treasurer' || role === 'president' || role === 'superadmin';

export default function AdminMoreScreen() {
    const {
        signOut,
        user,
        role,
        organizationId,
        organizationName,
        accessibleOrganizations,
        switchOrganization,
        setViewMode,
        isSuperadmin,
    } = useAuth();
    const navigation = useNavigation<any>();

    const items = [
        role ? { title: 'Socios y Solicitudes', icon: '👥', screen: 'ManageMembers' } : null,
        canManageFinance(role) ? { title: 'Gestion Financiera', icon: '💰', screen: 'AdminFinance' } : null,
        { title: 'Tablon de Favores', icon: '📌', screen: 'Favores' },
        { title: 'Agenda Vecinal', icon: '📆', screen: 'Agenda' },
        { title: 'Mapa del Barrio', icon: '🗺️', screen: 'MapaAdmin' },
        { title: 'Configuracion JJVV', icon: '⚙️', screen: 'AdminSettings' },
    ].filter(Boolean) as Array<{ title: string; icon: string; screen: string }>;

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <View style={s.header}>
                    <View style={s.adminBadge}>
                        <Text style={s.adminBadgeText}>
                            {isSuperadmin ? 'SUPERADMIN' : 'ADMINISTRACION'}
                        </Text>
                    </View>
                    <Text style={s.name}>{user?.user_metadata?.full_name || 'Administrador'}</Text>
                    <Text style={s.email}>{user?.email}</Text>
                    <Text style={s.orgName}>{organizationName || 'Sin organizacion activa'}</Text>
                    {role && <Text style={s.roleText}>Rol actual: {role}</Text>}
                </View>

                {isSuperadmin && <TouchableOpacity style={s.switchBtn} onPress={() => setViewMode('user')}>
                    <Text style={s.switchIcon}>🔄</Text>
                    <Text style={s.switchText}>Cambiar a Vista Usuario</Text>
                </TouchableOpacity>}

                {(accessibleOrganizations.length > 1 || (isSuperadmin && accessibleOrganizations.length > 0)) && (
                    <View style={s.orgCard}>
                        <Text style={s.orgCardTitle}>Cambiar organizacion</Text>
                        <Text style={s.orgCardSubtitle}>
                            {isSuperadmin
                                ? 'Tienes facultades administrativas en todas las JJVV creadas.'
                                : 'Selecciona la organizacion administrativa activa.'}
                        </Text>
                        {accessibleOrganizations.map((item) => {
                            const isSelected = item.organizationId === organizationId;
                            return (
                                <TouchableOpacity
                                    key={item.organizationId}
                                    style={[s.orgRow, isSelected && s.orgRowActive]}
                                    onPress={() => switchOrganization(item.organizationId)}
                                >
                                    <View style={s.orgTextWrap}>
                                        <Text style={[s.orgRowTitle, isSelected && s.orgRowTitleActive]}>
                                            {item.organizationName || 'Organizacion sin nombre'}
                                        </Text>
                                        <Text style={[s.orgRowRole, isSelected && s.orgRowRoleActive]}>
                                            Rol activo: {item.role}
                                        </Text>
                                    </View>
                                    <Text style={[s.orgRowBadge, isSelected && s.orgRowBadgeActive]}>
                                        {isSelected ? 'Activa' : 'Usar'}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {items.map((item) => (
                    <TouchableOpacity
                        key={item.screen}
                        style={s.row}
                        onPress={() => navigation.navigate(item.screen)}
                        activeOpacity={0.7}
                    >
                        <Text style={s.icon}>{item.icon}</Text>
                        <Text style={s.rowTitle}>{item.title}</Text>
                        <Text style={s.arrow}>›</Text>
                    </TouchableOpacity>
                ))}

                <TouchableOpacity style={s.logout} onPress={signOut}>
                    <Text style={s.logoutText}>Cerrar sesion</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.deleteAccount} onPress={() => navigation.navigate('DeleteAccount')}>
                    <Text style={s.deleteAccountText}>Eliminar mi cuenta</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 20 },
    header: { backgroundColor: '#1E3A5F', borderRadius: 16, padding: 20, marginBottom: 16 },
    adminBadge: {
        backgroundColor: '#7C3AED',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    adminBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
    name: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
    email: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
    orgName: { fontSize: 13, color: '#E2E8F0', marginTop: 10 },
    roleText: { fontSize: 12, color: '#F8FAFC', marginTop: 6, textTransform: 'capitalize' },
    switchBtn: {
        backgroundColor: '#1D4ED8',
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    switchIcon: { fontSize: 18, marginRight: 8 },
    switchText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
    orgCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 16, elevation: 1 },
    orgCardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    orgCardSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 12 },
    orgRow: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    orgRowActive: { borderColor: '#1D4ED8', backgroundColor: '#EFF6FF' },
    orgTextWrap: { flex: 1, marginRight: 8 },
    orgRowTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
    orgRowTitleActive: { color: '#1D4ED8' },
    orgRowRole: { fontSize: 12, color: '#64748B', marginTop: 2, textTransform: 'capitalize' },
    orgRowRoleActive: { color: '#2563EB' },
    orgRowBadge: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        overflow: 'hidden',
    },
    orgRowBadgeActive: { color: '#FFFFFF', backgroundColor: '#2563EB' },
    row: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 1,
    },
    icon: { fontSize: 22, marginRight: 12 },
    rowTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: '#334155' },
    arrow: { fontSize: 22, color: '#CBD5E1' },
    logout: {
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 24,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
    deleteAccount: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    deleteAccountText: {
        color: '#B91C1C',
        fontWeight: '700',
        fontSize: 15,
    },
});
