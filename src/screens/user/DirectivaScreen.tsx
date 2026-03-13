import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

type DirectivaMember = {
    user_id: string;
    role: string;
    profile: {
        full_name: string;
    };
};

export default function DirectivaScreen({ navigation }: any) {
    const { organizationId, organizationName } = useAuth();
    const [members, setMembers] = useState<DirectivaMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDirectiva();
    }, [organizationId]);

    const fetchDirectiva = async () => {
        if (!organizationId) return;
        setLoading(true);
        try {
            // Fetch members with board roles
            const { data, error } = await supabase
                .from('memberships')
                .select(`
                    user_id,
                    role,
                    profile:profiles(full_name)
                `)
                .eq('organization_id', organizationId)
                .in('role', ['president', 'secretary', 'treasurer', 'moderator'])
                .eq('is_active', true);

            if (error) {
                console.error('Error fetching directiva:', error);
            } else {
                setMembers(data as any);
            }
        } catch (err) {
            console.error('Unexpected error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'president': return 'Presidente';
            case 'secretary': return 'Secretario';
            case 'treasurer': return 'Tesorero';
            case 'moderator': return 'Moderador';
            default: return role;
        }
    };

    const getRoleEmoji = (role: string) => {
        switch (role) {
            case 'president': return '👑';
            case 'secretary': return '📄';
            case 'treasurer': return '💰';
            case 'moderator': return '⚖️';
            default: return '👤';
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backText}>← Volver</Text>
                </TouchableOpacity>
                <Text style={s.title}>Directiva</Text>
                <Text style={s.subTitle}>{organizationName || 'Tu Organización'}</Text>
            </View>

            <ScrollView contentContainerStyle={s.scroll}>
                {loading ? (
                    <ActivityIndicator size="large" color="#1E3A5F" style={{ marginTop: 40 }} />
                ) : members.length === 0 ? (
                    <View style={s.empty}>
                        <Text style={s.emptyEmoji}>🏢</Text>
                        <Text style={s.emptyText}>No se han definido los cargos de la directiva aún.</Text>
                    </View>
                ) : (
                    members.map((member, i) => (
                        <View key={i} style={s.card}>
                            <View style={s.roleBadge}>
                                <Text style={s.roleEmoji}>{getRoleEmoji(member.role)}</Text>
                            </View>
                            <View style={s.info}>
                                <Text style={s.roleName}>{getRoleLabel(member.role)}</Text>
                                <Text style={s.memberName}>{member.profile?.full_name || 'Sin nombre'}</Text>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { padding: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    backBtn: { marginBottom: 8 },
    backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F' },
    subTitle: { fontSize: 14, color: '#64748B' },
    scroll: { padding: 20 },
    card: { 
        backgroundColor: '#FFFFFF', 
        borderRadius: 16, 
        padding: 16, 
        marginBottom: 12, 
        flexDirection: 'row', 
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    roleBadge: { 
        width: 50, 
        height: 50, 
        borderRadius: 25, 
        backgroundColor: '#F1F5F9', 
        justifyContent: 'center', 
        alignItems: 'center',
        marginRight: 16
    },
    roleEmoji: { fontSize: 24 },
    info: { flex: 1 },
    roleName: { fontSize: 13, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', marginBottom: 2 },
    memberName: { fontSize: 18, fontWeight: '600', color: '#1E3A5F' },
    empty: { alignItems: 'center', marginTop: 60, padding: 40 },
    emptyEmoji: { fontSize: 60, marginBottom: 16 },
    emptyText: { fontSize: 16, color: '#94A3B8', textAlign: 'center', lineHeight: 24 },
});
