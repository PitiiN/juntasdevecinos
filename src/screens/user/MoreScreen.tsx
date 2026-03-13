import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../lib/store';

export default function MoreScreen() {
    const { signOut, user, isAdmin, setViewMode } = useAuth();
    const navigation = useNavigation<any>();
    const solicitudes = useAppStore(s => s.solicitudes);
    const documents = useAppStore(s => s.documents);
    const seenDocsCount = useAppStore(s => s.seenDocsCount);
    const seenAvisosCount = useAppStore(s => s.seenAvisosCount);
    const markDocsSeen = useAppStore(s => s.markDocsSeen);
    const announcements = useAppStore(s => s.announcements);
    const unreadAvisos = Math.max(0, announcements.length - (seenAvisosCount || 0));

    const mySolicitudes = solicitudes.filter(s => s.userEmail === user?.email || s.user === user?.user_metadata?.full_name);
    const unreadSolicitudes = mySolicitudes.filter(s => !s.seenByUser).length;
    const unreadDocs = Math.max(0, documents.length - seenDocsCount);

    // Helper function for navigation to tabs, assuming 'Home' is the tab navigator
    const goToTab = (screenName: string) => {
        navigation.navigate('Home', { screen: screenName });
    };

    const items = [
        { title: 'Avisos', icon: '📢', screen: 'Avisos', badge: unreadAvisos, isTab: true },
        { title: 'Directiva', icon: '🏢', screen: 'Directiva', badge: 0 },
        { title: 'Encuestas', icon: '📊', screen: 'Polls', badge: 0 },
        { title: 'Mis Solicitudes', icon: '📝', screen: 'Solicitudes', badge: unreadSolicitudes },
        { title: 'Mis Cuotas', icon: '💸', screen: 'Dues', badge: 0 },
        { title: 'Documentos', icon: '📁', screen: 'Documents', badge: unreadDocs },
        { title: 'Favores', icon: '🤝', screen: 'Favores', badge: 0 },
        { title: 'Mapa del Barrio', icon: '🗺️', screen: 'NeighborhoodMap', badge: 0 },
        { title: 'Mi Perfil', icon: '👤', screen: 'Profile', badge: 0 },
        { title: 'Accesibilidad', icon: '☉', screen: 'Accessibility', badge: 0 },
    ];

    const handlePress = (item: any) => {
        if (item.screen === 'Documents') markDocsSeen();
        if (item.isTab) {
            navigation.navigate(item.screen);
        } else {
            navigation.navigate(item.screen);
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <View style={s.header}>
                    <Text style={s.name}>{user?.user_metadata?.full_name || 'Vecino'}</Text>
                    <Text style={s.email}>{user?.email}</Text>
                </View>

                {isAdmin && (
                    <TouchableOpacity style={s.switchBtn} onPress={() => setViewMode('admin')}>
                        <Text style={s.switchIcon}>👑</Text>
                        <Text style={s.switchText}>Cambiar a Vista Administrador</Text>
                    </TouchableOpacity>
                )}

                {items.map((item, i) => (
                    <TouchableOpacity
                        key={i}
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
                    <Text style={s.logoutText}>🚪 Cerrar Sesión</Text>
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
    switchBtn: { backgroundColor: '#7C3AED', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    switchIcon: { fontSize: 18, marginRight: 8 },
    switchText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
    row: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    rowIcon: { fontSize: 22, marginRight: 12 },
    rowTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: '#334155' },
    arrow: { fontSize: 22, color: '#CBD5E1' },
    badge: { backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6, marginRight: 8 },
    badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
    logout: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20, borderWidth: 1, borderColor: '#FECACA' },
    logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
});
