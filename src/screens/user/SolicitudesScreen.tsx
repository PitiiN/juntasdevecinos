import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../lib/store';

const CATEGORIES = ['Certificado de Residencia', 'Áreas Verdes', 'Nuevo', 'Servicio/Oficio/Emprendimiento', 'Otros'];

export default function SolicitudesScreen({ navigation }: any) {
    const { user } = useAuth();
    const addSolicitud = useAppStore(s => s.addSolicitud);
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería.'); return; }
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.7 });
        if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permisos', 'Se necesitan permisos para usar la cámara.'); return; }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
        if (!result.canceled && result.assets[0]) setImage(result.assets[0].uri);
    };

    const handleSubmit = () => {
        if (!category) { Alert.alert('Error', 'Selecciona una categoría para tu solicitud.'); return; }
        if (!description.trim()) { Alert.alert('Error', 'Escribe una descripción de tu solicitud.'); return; }
        setLoading(true);
        addSolicitud({
            title: description.substring(0, 50) + (description.length > 50 ? '...' : ''),
            description,
            category,
            user: user?.user_metadata?.full_name || 'Vecino',
            userEmail: user?.email || '',
            hasImage: !!image,
            imageUri: image || undefined,
        });
        setLoading(false);
        Alert.alert('✅ Solicitud enviada', 'Tu solicitud ha sido registrada. Puedes hacer seguimiento en "Mis Solicitudes".', [
            { text: 'OK', onPress: () => { setDescription(''); setCategory(''); setImage(null); navigation.goBack(); } }
        ]);
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Text style={s.backText}>← Volver</Text></TouchableOpacity>
                <Text style={s.title}>📝 Nueva Solicitud</Text>
                <Text style={s.subtitle}>Cuéntanos qué necesitas o qué problema detectaste</Text>

                <Text style={s.label}>Categoría</Text>
                <TouchableOpacity style={s.pickerBtn} onPress={() => setShowPicker(true)}>
                    <Text style={category ? s.pickerSelected : s.pickerPlaceholder}>
                        {category || 'Selecciona una categoría...'}
                    </Text>
                    <Text style={s.pickerArrow}>▼</Text>
                </TouchableOpacity>

                <Modal visible={showPicker} transparent animationType="fade">
                    <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
                        <View style={s.modalContent}>
                            <Text style={s.modalTitle}>Selecciona categoría</Text>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity key={cat} style={[s.modalOption, category === cat && s.modalOptionActive]} onPress={() => { setCategory(cat); setShowPicker(false); }}>
                                    <Text style={[s.modalOptionText, category === cat && s.modalOptionTextActive]}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>

                <Text style={s.label}>Descripción</Text>
                <TextInput style={s.textArea} placeholder="Describe tu solicitud..." placeholderTextColor="#94A3B8" value={description} onChangeText={setDescription} multiline numberOfLines={5} textAlignVertical="top" />
                <Text style={s.label}>Adjuntar imagen (opcional)</Text>
                <View style={s.imageRow}>
                    <TouchableOpacity style={s.imageBtn} onPress={pickImage}><Text style={s.imageBtnEmoji}>🖼️</Text><Text style={s.imageBtnText}>Galería</Text></TouchableOpacity>
                    <TouchableOpacity style={s.imageBtn} onPress={takePhoto}><Text style={s.imageBtnEmoji}>📷</Text><Text style={s.imageBtnText}>Cámara</Text></TouchableOpacity>
                </View>
                {image && (<View style={s.preview}><Image source={{ uri: image }} style={s.previewImg} /><TouchableOpacity onPress={() => setImage(null)} style={s.removeImg}><Text style={s.removeText}>✕</Text></TouchableOpacity></View>)}
                <TouchableOpacity style={[s.submitBtn, loading && s.submitDisabled]} onPress={handleSubmit} disabled={loading}><Text style={s.submitText}>{loading ? 'Enviando...' : '✅ Enviar Solicitud'}</Text></TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' }, scroll: { padding: 20 }, back: { marginBottom: 16 }, backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 4 }, subtitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 16 },
    pickerBtn: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E2E8F0', elevation: 1 },
    pickerSelected: { fontSize: 16, color: '#0F172A' }, pickerPlaceholder: { fontSize: 16, color: '#94A3B8' }, pickerArrow: { color: '#94A3B8', fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 40 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 340 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 16, textAlign: 'center' },
    modalOption: { padding: 14, borderRadius: 10, marginBottom: 6, backgroundColor: 'transparent' },
    modalOptionActive: { backgroundColor: '#2563EB' },
    modalOptionText: { fontSize: 15, color: '#334155', textAlign: 'center' },
    modalOptionTextActive: { color: '#FFFFFF', fontWeight: '600' },
    textArea: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, fontSize: 16, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', minHeight: 120, elevation: 1 },
    imageRow: { flexDirection: 'row', gap: 12 },
    imageBtn: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', elevation: 1 },
    imageBtnEmoji: { fontSize: 28, marginBottom: 4 }, imageBtnText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    preview: { marginTop: 12, borderRadius: 12, overflow: 'hidden', position: 'relative' }, previewImg: { width: '100%', height: 200, borderRadius: 12 },
    removeImg: { position: 'absolute', top: 8, right: 8, backgroundColor: '#EF4444', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    removeText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
    submitBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 40 },
    submitDisabled: { opacity: 0.6 }, submitText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
