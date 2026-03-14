import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { getRoleLabel, Role } from '../../lib/constants';

type DirectivaMember = {
    user_id: string;
    role: Role;
    full_name: string | null;
};

const BOARD_STRUCTURE: { role: Role; label: string; emoji: string }[] = [
    { role: 'president', label: 'Presidencia', emoji: '👑' },
    { role: 'director', label: 'Dirección', emoji: '🧭' },
    { role: 'secretary', label: 'Secretaría', emoji: '📄' },
    { role: 'treasurer', label: 'Tesorería', emoji: '💰' },
];

const DIRECTIVA_BUCKET = 'jjvv-directiva';

export default function DirectivaScreen({ navigation }: any) {
    const { organizationId, organizationName, directivaImageUrl, role, viewMode, refreshSession } = useAuth();
    const [members, setMembers] = useState<DirectivaMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);

    const isEditor = (role === 'director' || role === 'president' || role === 'superadmin') && viewMode === 'admin';

    useEffect(() => {
        void fetchDirectiva();
    }, [organizationId]);

    useEffect(() => {
        let cancelled = false;

        const resolveImage = async () => {
            if (!directivaImageUrl) {
                if (!cancelled) {
                    setResolvedImageUrl(null);
                }
                return;
            }

            if (directivaImageUrl.startsWith('http://') || directivaImageUrl.startsWith('https://')) {
                if (!cancelled) {
                    setResolvedImageUrl(directivaImageUrl);
                }
                return;
            }

            const { data, error } = await supabase.storage.from(DIRECTIVA_BUCKET).createSignedUrl(directivaImageUrl, 3600);
            if (!cancelled) {
                setResolvedImageUrl(error ? null : data?.signedUrl || null);
            }
        };

        void resolveImage();

        return () => {
            cancelled = true;
        };
    }, [directivaImageUrl]);

    const fetchDirectiva = async () => {
        if (!organizationId) {
            setMembers([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.rpc('list_board_members', {
                p_org_id: organizationId,
            });

            if (error) {
                console.error('Error fetching directiva:', error);
                setMembers([]);
                return;
            }

            setMembers((data || []) as DirectivaMember[]);
        } catch (err) {
            console.error('Unexpected error fetching directiva:', err);
            setMembers([]);
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

        if (!result.canceled && result.assets[0]?.uri) {
            await uploadBoardImage(result.assets[0].uri, result.assets[0].mimeType || 'image/jpeg');
        }
    };

    const uploadBoardImage = async (fileUri: string, mimeType: string) => {
        if (!organizationId) {
            return;
        }

        setUploading(true);

        try {
            const filePath = `${organizationId}/directiva-${Date.now()}.jpg`;
            const response = await fetch(fileUri);
            const arrayBuffer = await response.arrayBuffer();
            const { error: uploadError } = await supabase.storage
                .from(DIRECTIVA_BUCKET)
                .upload(filePath, arrayBuffer, {
                    contentType: mimeType,
                    upsert: true,
                });

            if (uploadError) {
                throw uploadError;
            }

            const { error } = await supabase
                .from('organizations')
                .update({ directiva_image_url: filePath })
                .eq('id', organizationId);

            if (error) {
                throw error;
            }

            Alert.alert('Éxito', 'Foto de la directiva actualizada correctamente.');
            await refreshSession();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'No se pudo actualizar la imagen.');
        } finally {
            setUploading(false);
        }
    };

    const renderBoardMember = (structure: typeof BOARD_STRUCTURE[number]) => {
        const member = members.find((item) => item.role === structure.role);

        return (
            <View key={structure.role} style={s.sectionContainer}>
                <Text style={s.sectionTitle}>{structure.emoji} {structure.label}</Text>
                <View style={member ? s.card : s.cardEmpty}>
                    <Text style={member ? s.memberName : s.emptyText}>
                        {member ? (member.full_name || 'Sin nombre') : `Cargo vacío (${getRoleLabel(structure.role)})`}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backText}>Volver</Text>
                </TouchableOpacity>
                <Text style={s.title}>Directiva</Text>
                <Text style={s.subTitle}>{organizationName || 'Tu organización'}</Text>
            </View>

            <ScrollView contentContainerStyle={s.scroll}>
                <View style={s.imageContainer}>
                    {resolvedImageUrl ? (
                        <Image source={{ uri: resolvedImageUrl }} style={s.boardImage} resizeMode="cover" />
                    ) : (
                        <View style={s.placeholderImage}>
                            <Text style={s.placeholderIcon}>👥</Text>
                            <Text style={s.placeholderText}>Foto de la directiva no disponible</Text>
                        </View>
                    )}

                    {isEditor && (
                        <TouchableOpacity style={s.uploadOverlay} onPress={handlePickImage} disabled={uploading}>
                            <Text style={s.uploadText}>{uploading ? 'Subiendo...' : 'Cambiar Foto'}</Text>
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
        elevation: 4,
    },
    uploadText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    structureList: { padding: 20 },
    sectionContainer: { marginBottom: 20 },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#64748B',
        textTransform: 'uppercase',
        marginBottom: 8,
        letterSpacing: 1,
    },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#2563EB', elevation: 1 },
    cardEmpty: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1' },
    memberName: { fontSize: 18, fontWeight: '600', color: '#1E3A5F' },
    emptyText: { fontSize: 16, color: '#94A3B8', fontStyle: 'italic' },
});
