import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { favorService } from '../../services/favorService';

const POSTIT_COLORS = ['#FEF3C7', '#DBEAFE', '#D1FAE5', '#FCE7F3'];

export default function FavoresScreen({ navigation }: any) {
    const favors = useAppStore(s => s.favors);
    const { setFavors } = useAppStore();
    const { user, organizationId } = useAuth();

    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const loadFavors = async () => {
        if (!organizationId) return;
        setIsLoading(true);
        try {
            const data = await favorService.getFavors(organizationId);
            setFavors(data);
        } catch (error) {
            console.error('Error loading favors:', error);
            Alert.alert('Error', 'No se pudieron cargar los favores');
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        loadFavors();
    }, [organizationId]);

    // Realtime subscription
    React.useEffect(() => {
        if (!organizationId) return;
        
        const subscription = favorService.subscribeToFavors(organizationId, () => {
            loadFavors();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [organizationId]);

    const activeFavors = favors.filter(f => !f.resolved);

    const handleSave = async () => {
        console.log('DEBUG [FavoresScreen]: user:', user?.email, 'orgId:', organizationId);

        if (!title.trim() || !description.trim()) {
            Alert.alert('Error', 'Completa título y descripción');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'No se pudo identificar al usuario. Por favor, re-inicia sesión.');
            return;
        }

        if (!organizationId) {
            // Try to find an organization if it's missing but we have a user
            Alert.alert('Error', 'No se pudo identificar tu organización/comunidad. Verifica tu perfil.');
            return;
        }

        setIsLoading(true);
        try {
            if (editId) {
                await favorService.updateFavor(editId, { title, description });
                Alert.alert('✅ Favor actualizado');
            } else {
                const authorName = user?.user_metadata?.full_name || 'Vecino';
                await favorService.createFavor({
                    title,
                    description,
                    author: authorName,
                    userEmail: user.email || 'desconocido',
                    organization_id: organizationId,
                    user_id: user.id
                });
                Alert.alert('✅ Favor publicado');
            }
            await loadFavors();
            setShowForm(false); setEditId(null);
            setTitle(''); setDescription('');
        } catch (error) {
            console.error('Error saving favor:', error);
            Alert.alert('Error', 'No se pudo guardar el favor');
        } finally {
            setIsLoading(false);
        }
    };

    const startEdit = (f: any) => {
        const isExpired = (Date.now() - f.createdAt) > 24 * 60 * 60 * 1000;
        if (isExpired) {
            Alert.alert('No editable', 'Los favores no pueden modificarse después de 24 horas para mantener su contexto.');
            return;
        }
        setEditId(f.id);
        setTitle(f.title);
        setDescription(f.description);
        setShowForm(true);
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            '🗑️ Eliminar Favor',
            `¿Estás seguro? Esta acción no se puede deshacer.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, eliminar', style: 'destructive', onPress: async () => {
                        setIsLoading(true);
                        try {
                            await favorService.deleteFavor(id);
                            await loadFavors();
                        } catch (error) {
                            console.error('Error deleting favor:', error);
                            Alert.alert('Error', 'No se pudo eliminar el favor');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const markResolved = (id: string, title: string) => {
        Alert.alert(
            'Confirmar Resolución',
            `¿Estás seguro que el favor "${title}" ya fue resuelto? Desaparecerá del tablón activo.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Sí, Resuelto', onPress: async () => {
                        setIsLoading(true);
                        try {
                            await favorService.updateFavor(id, { resolved: true });
                            await loadFavors();
                        } catch (error) {
                            console.error('Error resolving favor:', error);
                            Alert.alert('Error', 'No se pudo marcar como resuelto');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Splitting array for "masonry" 2-col look
    const col1 = activeFavors.filter((_, i) => i % 2 === 0);
    const col2 = activeFavors.filter((_, i) => i % 2 !== 0);

    const renderCard = (f: any, index: number) => {
        const isMine = f.userEmail === user?.email;
        const color = POSTIT_COLORS[(index + f.id.length) % POSTIT_COLORS.length];

        return (
            <View key={f.id} style={[s.postit, { backgroundColor: color }]}>
                <Text style={s.pTitle}>{f.title}</Text>
                <Text style={s.pDesc}>{f.description}</Text>
                <View style={s.pFooter}>
                    <Text style={s.pAuthor}>Por: {f.author}</Text>
                    <Text style={s.pDate}>{f.date}</Text>
                </View>

                {isMine && (
                    <View style={s.ownerActions}>
                        <TouchableOpacity style={s.actionBtnText} onPress={() => startEdit(f)}><Text>✏️</Text></TouchableOpacity>
                        <TouchableOpacity style={s.actionBtnText} onPress={() => handleDelete(f.id)}><Text>🗑️</Text></TouchableOpacity>
                        <TouchableOpacity style={s.resolveBtn} onPress={() => markResolved(f.id, f.title)}>
                            <Text style={s.resolveText}>✅ Resuelto</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Text style={s.backText}>← Volver</Text>
                </TouchableOpacity>
                <Text style={s.title}>Tablón de Favores 🤝</Text>
            </View>

            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity style={s.newBtn} onPress={() => setShowForm(!showForm)}>
                    <Text style={s.newBtnText}>{showForm ? '✕ Cancelar' : '✍️ Pedir un Favor'}</Text>
                </TouchableOpacity>

                {showForm && (
                    <View style={s.form}>
                        <Text style={s.formTitle}>{editId ? 'Editar Favor' : 'Nuevo Favor'}</Text>
                        <TextInput style={s.input} placeholder="Resumen corto..." value={title} onChangeText={setTitle} />
                        <TextInput style={[s.input, s.multiline]} placeholder="Cuéntanos más detalle..." value={description} onChangeText={setDescription} multiline />
                        <TouchableOpacity style={s.submitBtn} onPress={handleSave}>
                            <Text style={s.submitText}>Publicar Post-it</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {activeFavors.length === 0 ? (
                    <View style={s.empty}><Text style={s.emptyText}>No hay favores activos</Text></View>
                ) : (
                    <View style={s.masonryContainer}>
                        <View style={s.masonryCol}>
                            {col1.map((f, i) => renderCard(f, i * 2))}
                        </View>
                        <View style={s.masonryCol}>
                            {col2.map((f, i) => renderCard(f, i * 2 + 1))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    backBtn: { marginRight: 15 },
    backText: { color: '#3B82F6', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#1E3A5F' },
    scroll: { padding: 15 },
    newBtn: { backgroundColor: '#1E3A5F', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 20 },
    newBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    form: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    formTitle: { fontSize: 18, fontWeight: 'bold', color: '#334155', marginBottom: 12 },
    input: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 12 },
    multiline: { minHeight: 80, textAlignVertical: 'top' },
    submitBtn: { backgroundColor: '#3B82F6', padding: 14, borderRadius: 10, alignItems: 'center' },
    submitText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    masonryContainer: { flexDirection: 'row', justifyContent: 'space-between' },
    masonryCol: { width: '48%' },
    postit: { padding: 14, borderRadius: 8, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 },
    pTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 6 },
    pDesc: { fontSize: 13, color: '#334155', marginBottom: 12, lineHeight: 18 },
    pFooter: { borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)', paddingTop: 8 },
    pAuthor: { fontSize: 11, fontWeight: '600', color: '#475569' },
    pDate: { fontSize: 10, color: '#64748B', marginTop: 2 },
    ownerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.1)', paddingTop: 8 },
    actionBtnText: { padding: 4 },
    resolveBtn: { backgroundColor: 'rgba(0,0,0,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    resolveText: { fontSize: 11, fontWeight: '700', color: '#059669' },
    empty: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#94A3B8', fontSize: 16 },
});
