import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../lib/store';
import { useTicketCounters } from '../../hooks/useTicketCounters';

export default function MoreScreen() {
    const {
        signOut,
        user,
        isSuperadmin,
        setViewMode,
        organizationId,
        organizationName,
        accessibleOrganizations,
        switchOrganization,
    } = useAuth();
    const navigation = useNavigation<any>();
    const documents = useAppStore((state) => state.documents);
    const seenDocsCount = useAppStore((state) => state.seenDocsCount);
    const seenAvisosCount = useAppStore((state) => state.seenAvisosCount);
    const markDocsSeen = useAppStore((state) => state.markDocsSeen);
    const announcements = useAppStore((state) => state.announcements);
    const unreadDocs = Math.max(0, documents.length - seenDocsCount);
    const unreadAvisos = Math.max(0, announcements.length - (seenAvisosCount || 0));
    const { myUnreadCount } = useTicketCounters(organizationId);

    const items = [
        { title: 'Avisos', icon: '📢', screen: 'Avisos', badge: unreadAvisos },
        { title: 'Directiva', icon: '🏢', screen: 'Directiva', badge: 0 },
        { title: 'Encuestas', icon: '📊', screen: 'Polls', badge: 0 },
        { title: 'Mis Solicitudes', icon: '📝', screen: 'Solicitudes', badge: myUnreadCount },
        { title: 'Mis Cuotas', icon: '💸', screen: 'Dues', badge: 0 },
        { title: 'Documentos', icon: '📁', screen: 'Documents', badge: unreadDocs },
        { title: 'Favores', icon: '🤝', screen: 'Favores', badge: 0 },
        { title: 'Mapa del Barrio', icon: '🗺️', screen: 'NeighborhoodMap', badge: 0 },
        { title: 'Mi Perfil', icon: '👤', screen: 'Profile', badge: 0 },
        { title: 'Accesibilidad', icon: '☉', screen: 'Accessibility', badge: 0 },
    ];

    const handlePress = (item: typeof items[number]) => {
        if (item.screen === 'Documents') {
            markDocsSeen();
        }
        navigation.navigate(item.screen);
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <View style={s.header}>
                    <Text style={s.name}>{user?.user_metadata?.full_name || 'Vecino'}</Text>
                    <Text style={s.email}>{user?.email}</Text>
                    <Text style={s.orgName}>{organizationName || 'Sin organizacion activa'}</Text>
                    {isSuperadmin && <Text style={s.superadminTag}>Superadmin global</Text>}
                </View>

                {isSuperadmin && (
                    <TouchableOpacity style={s.switchBtn} onPress={() => setViewMode('admin')}>
                        <Text style={s.switchIcon}>🛡</Text>
                        <Text style={s.switchText}>Cambiar a Vista Administrador</Text>
                    </TouchableOpacity>
                )}

                {(accessibleOrganizations.length > 1 || (isSuperadmin && accessibleOrganizations.length > 0)) && (
                    <View style={s.orgCard}>
                        <Text style={s.orgCardTitle}>Cambiar organizacion</Text>
                        <Text style={s.orgCardSubtitle}>
                            {isSuperadmin
                                ? 'Puedes administrar cualquier JJVV creada en la plataforma.'
                                : 'Elige la organizacion activa para esta sesion.'}
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

                {items.map((item, index) => (
                    <TouchableOpacity
                        key={`${item.screen}-${index}`}
                        style={s.row}
                        onPress={() => handlePress(item)}
                        activeOpacity={0.7}
                    >
                        <Text style={s.rowIcon}>{item.icon}</Text>
                        <Text style={s.rowTitle}>{item.title}</Text>
                        {item.badge > 0 && (
                            <View style={s.badge}>
                                <Text style={s.badgeText}>{item.badge > 9 ? '9+' : item.badge}</Text>
                            </View>
                        )}
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
    name: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
    email: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
    orgName: { fontSize: 13, color: '#E2E8F0', marginTop: 10 },
    superadminTag: {
        alignSelf: 'flex-start',
        marginTop: 10,
        backgroundColor: '#FBBF24',
        color: '#1E293B',
        fontSize: 12,
        fontWeight: '700',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        overflow: 'hidden',
    },
    switchBtn: {
        backgroundColor: '#7C3AED',
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
    orgRowActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
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
    rowIcon: { fontSize: 22, marginRight: 12 },
    rowTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: '#334155' },
    arrow: { fontSize: 22, color: '#CBD5E1' },
    badge: {
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        marginRight: 8,
    },
    badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
    logout: {
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 20,
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
