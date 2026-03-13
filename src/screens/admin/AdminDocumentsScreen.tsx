import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useAppStore, Document } from '../../lib/store';

const EMOJIS: Record<string, string> = { 'Acta': '📋', 'Reglamento': '📖', 'Finanzas': '💰', 'Legal': '📜', 'Seguridad': '🔒', 'Otro': '📄' };

export default function AdminDocumentsScreen() {
    const { documents, addDocument, removeDocument } = useAppStore();
    const [showUpload, setShowUpload] = useState(false);
    const [title, setTitle] = useState('');
    const [docType, setDocType] = useState('Acta');
    const [fileName, setFileName] = useState('');
    const [selectedFolder, setSelectedFolder] = useState<Document['folder']>('Actas');
    const types = ['Acta', 'Reglamento', 'Finanzas', 'Legal', 'Seguridad', 'Otro'];
    const folders = ['Actas', 'Documentos relativos', 'Documentos contables', 'General'];

    const pickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
        if (!result.canceled && result.assets[0]) setFileName(result.assets[0].name);
    };

    const handleUpload = () => {
        if (!title || !fileName) { Alert.alert('Error', 'Completa el título y selecciona un archivo.'); return; }
        addDocument({ title, type: docType, emoji: EMOJIS[docType] || '📄', folder: selectedFolder });
        Alert.alert('✅ Documento subido', `"${title}" es visible para todos los vecinos.`);
        setShowUpload(false); setTitle(''); setFileName('');
    };

    const handleDelete = (id: string, name: string) => {
        Alert.alert('¿Eliminar documento?', `¿Estás seguro de eliminar "${name}"? Esta acción no se puede deshacer.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => removeDocument(id) },
        ]);
    };

    const groupedDocs = documents.reduce((acc, doc) => {
        const folder = doc.folder || 'General';
        if (!acc[folder]) acc[folder] = [];
        acc[folder].push(doc);
        return acc;
    }, {} as Record<string, typeof documents>);

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <Text style={s.title}>📁 Gestionar Documentos</Text>
                <TouchableOpacity style={s.uploadBtn} onPress={() => setShowUpload(!showUpload)}>
                    <Text style={s.uploadBtnText}>{showUpload ? '✕ Cancelar' : '📤 Subir Documento'}</Text>
                </TouchableOpacity>
                {showUpload && (
                    <View style={s.form}>
                        <Text style={s.label}>Título del documento</Text>
                        <TextInput style={s.input} placeholder="Ej: Acta Reunión Marzo" placeholderTextColor="#94A3B8" value={title} onChangeText={setTitle} />
                        
                        <Text style={s.label}>Carpeta de destino</Text>
                        <View style={s.typeRow}>
                            {folders.map(f => (
                                <TouchableOpacity key={f} style={[s.folderChip, selectedFolder === f && s.typeChipActive]} onPress={() => setSelectedFolder(f as any)}>
                                    <Text style={[s.typeChipText, selectedFolder === f && s.typeChipTextActive]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={s.label}>Categoría/Tipo</Text>
                        <View style={s.typeRow}>
                            {types.map(t => (
                                <TouchableOpacity key={t} style={[s.typeChip, docType === t && s.typeChipActive]} onPress={() => setDocType(t)}>
                                    <Text style={[s.typeChipText, docType === t && s.typeChipTextActive]}>{t}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={s.label}>Archivo</Text>
                        <TouchableOpacity style={s.fileBtn} onPress={pickDocument}><Text style={s.fileBtnText}>{fileName || '📎 Seleccionar archivo...'}</Text></TouchableOpacity>
                        <TouchableOpacity style={s.submitBtn} onPress={handleUpload}><Text style={s.submitBtnText}>Publicar Documento</Text></TouchableOpacity>
                    </View>
                )}
                
                <Text style={s.section}>Documentos publicados ({documents.length})</Text>
                {Object.keys(groupedDocs).map(folder => (
                    <View key={folder}>
                        <Text style={s.folderHeader}>📁 {folder}</Text>
                        {groupedDocs[folder].map(doc => (
                            <View key={doc.id} style={s.card}>
                                <Text style={s.emoji}>{doc.emoji}</Text>
                                <View style={s.info}><Text style={s.docTitle}>{doc.title}</Text><Text style={s.meta}>{doc.type} • {doc.date}</Text></View>
                                <TouchableOpacity onPress={() => handleDelete(doc.id, doc.title)}><Text style={s.delete}>🗑️</Text></TouchableOpacity>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 16 },
    uploadBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
    uploadBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    form: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20, elevation: 2 },
    label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6, marginTop: 10 },
    input: { backgroundColor: 'transparent', borderRadius: 10, padding: 12, fontSize: 15, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0' },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
    typeChip: { backgroundColor: 'transparent', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#E2E8F0' },
    folderChip: { backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#E2E8F0' },
    typeChipActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
    typeChipText: { color: '#94A3B8', fontSize: 13 },
    typeChipTextActive: { color: '#2563EB', fontWeight: '600' },
    fileBtn: { backgroundColor: 'transparent', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
    fileBtnText: { color: '#94A3B8', fontSize: 14 },
    submitBtn: { backgroundColor: '#22C55E', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
    submitBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    section: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 10, marginTop: 8 },
    folderHeader: { fontSize: 14, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 8, marginTop: 16, backgroundColor: '#F1F5F9', padding: 6, borderRadius: 6 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    emoji: { fontSize: 24, marginRight: 12 },
    info: { flex: 1 },
    docTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
    meta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    delete: { fontSize: 18 },
});
