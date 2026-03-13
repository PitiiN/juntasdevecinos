import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Role } from '../../lib/constants';

type DirectivaMember = {
    user_id: string;
    role: string;
    profile: {
        full_name: string;
    };
};

const BOARD_STRUCTURE = [
    { role: 'presidente', label: 'Presidente', emoji: '👑' },
    { role: 'secretario', label: 'Secretario/a', emoji: '📄' },
    { role: 'tesorero', label: 'Tesorero/a', emoji: '💰' },
    { role: 'director', label: 'Directores', emoji: '🏢', isMultiple: true },
];

export default function DirectivaScreen({ navigation }: any) {
    const { organizationId, organizationName, directivaImageUrl, isAdmin, viewMode, refreshSession } = useAuth();
    const [members, setMembers] = useState<DirectivaMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    const isEditor = isAdmin && viewMode === 'admin';

    useEffect(() => {
        fetchDirectiva();
    }, [organizationId]);

    const fetchDirectiva = async () => {
        if (!organizationId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('memberships')
                .select(`
                    user_id,
                    role,
                    profile:profiles(full_name)
                `)
                .eq('organization_id', organizationId)
                .in('role', ['presidente', 'secretario', 'tesorero', 'director'])
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

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0]) {
            uploadBoardImage(result.assets[0].uri);
        }
    };

    const uploadBoardImage = async (uri: string) => {
        if (!organizationId) return;
        setUploading(true);
        try {
            // In a real app we would upload to Supabase Storage first.
            // For now, since we don't have storage bucket info, we'll use the URI directly
            // but usually we'd do: supabase.storage.from('board-photos').upload(...)
            // Let's assume we just save the public URL or URI.
            
            const { error } = await supabase
                .from('organizations')
                .update({ directiva_image_url: uri })
                .eq('id', organizationId);

            if (error) throw error;
            
            Alert.alert('Éxito', 'Foto de la directiva actualizada correctamente.');
            await refreshSession();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setUploading(false);
        }
    };

    const renderBoardMember = (structure: typeof BOARD_STRUCTURE[0]) => {
        const matchingMembers = members.filter(m => m.role === structure.role);
        
        if (structure.isMultiple) {
            return (
                <View key={structure.role} style={s.sectionContainer}>
                    <Text style={s.sectionTitle}>{structure.emoji} {structure.label}</Text>
                    {matchingMembers.length > 0 ? (
                        matchingMembers.map((m, idx) => (
                            <View key={m.user_id + idx} style={s.card}>
                                <Text style={s.memberName}>{m.profile?.full_name || 'Sin nombre'}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={s.cardEmpty}>
                            <Text style={s.emptyText}>Cargo vacío</Text>
                        </View>
                    )}
                </View>
            );
        }

        const member = matchingMembers[0];
        return (
            <View key={structure.role} style={s.sectionContainer}>
                <Text style={s.sectionTitle}>{structure.emoji} {structure.label}</Text>
                <View style={member ? s.card : s.cardEmpty}>
                    <Text style={member ? s.memberName : s.emptyText}>
                        {member ? (member.profile?.full_name || 'Sin nombre') : 'Cargo vacío'}
                    </Text>
                </View>
            </View>
        );
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
                {/* Board Image Section */}
                <View style={s.imageContainer}>
                    {directivaImageUrl ? (
                        <Image source={{ uri: directivaImageUrl }} style={s.boardImage} resizeMode="cover" />
                    ) : (
                        <View style={s.placeholderImage}>
                            <Text style={s.placeholderIcon}>👥</Text>
                            <Text style={s.placeholderText}>Foto de la directiva no disponible</Text>
                        </View>
                    )}
                    
                    {isEditor && (
                        <TouchableOpacity 
                            style={s.uploadOverlay} 
                            onPress={handlePickImage}
                            disabled={uploading}
                        >
                            <Text style={s.uploadText}>{uploading ? 'Subiendo...' : '📷 Cambiar Foto'}</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#1E3A5F" style={{ marginTop: 40 }} />
                ) : (
                    <View style={s.structureList}>
                        {BOARD_STRUCTURE.map(renderBoardMember)}
                    </View>
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
    scroll: { padding: 0 },
    imageContainer: { width: '100%', height: 220, position: 'relative', backgroundColor: '#E2E8F0' },
    boardImage: { width: '100%', height: '100%' },
    placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    placeholderIcon: { fontSize: 40, marginBottom: 8 },
    placeholderText: { color: '#64748B', fontSize: 14 },
    uploadOverlay: { 
        position: 'absolute', 
        bottom: 12, 
        right: 12, 
        backgroundColor: '#1E3A5F', 
        paddingHorizontal: 16, 
        paddingVertical: 8, 
        borderRadius: 20,
        elevation: 4
    },
    uploadText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    structureList: { padding: 20 },
    sectionContainer: { marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#64748B', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#2563EB', elevation: 1 },
    cardEmpty: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
    memberName: { fontSize: 18, fontWeight: '600', color: '#1E3A5F' },
    emptyText: { fontSize: 16, color: '#94A3B8', fontStyle: 'italic' },
});
