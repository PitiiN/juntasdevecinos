import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

export default function AdminMoreScreen() {
    const { signOut, user, setViewMode } = useAuth();
    const navigation = useNavigation<any>();

    const items = [
        { title: 'Gestionar Socios', icon: '👥', screen: 'ManageMembers' },
        { title: 'Gestión Financiera', icon: '💰', screen: 'AdminFinance' },
        { title: 'Tablón de Favores', icon: '📌', screen: 'Favores' },
        { title: 'Agenda Vecinal', icon: '📅', screen: 'Agenda' },
        { title: 'Mapa del Barrio', icon: '🗺️', screen: 'MapaAdmin' },
        { title: 'Configuración JJVV', icon: '⚙️', screen: 'AdminSettings' },
    ];

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <View style={s.header}>
                    <View style={s.adminBadge}><Text style={s.adminBadgeText}>👑 ADMINISTRADOR</Text></View>
                    <Text style={s.name}>{user?.user_metadata?.full_name || 'Admin'}</Text>
                    <Text style={s.email}>{user?.email}</Text>
                </View>

                <TouchableOpacity style={s.switchBtn} onPress={() => setViewMode('user')}>
                    <Text style={s.switchIcon}>🔄</Text>
                    <Text style={s.switchText}>Cambiar a Vista Usuario</Text>
                </TouchableOpacity>

                {items.map((item, i) => (
                    <TouchableOpacity key={i} style={s.row} onPress={() => item.screen && navigation.navigate(item.screen)} activeOpacity={item.screen ? 0.7 : 1}>
                        <Text style={s.icon}>{item.icon}</Text>
                        <Text style={s.rowTitle}>{item.title}</Text>
                        <Text style={s.arrow}>{item.screen ? '›' : ''}</Text>
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
    adminBadge: { backgroundColor: '#7C3AED', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 8 },
    adminBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
    name: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
    email: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
    switchBtn: { backgroundColor: '#1D4ED8', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    switchIcon: { fontSize: 18, marginRight: 8 },
    switchText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
    row: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    icon: { fontSize: 22, marginRight: 12 },
    rowTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: '#334155' },
    arrow: { fontSize: 22, color: '#CBD5E1' },
    logout: { backgroundColor: '#FEF2F2', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24, borderWidth: 1, borderColor: '#FECACA' },
    logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
});
