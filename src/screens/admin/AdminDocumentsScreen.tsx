import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useAppStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { documentService, CommunityDocument, DocumentFolder } from '../../services/documentService';

const EMOJIS: Record<string, string> = {
    Acta: '📋',
    Reglamento: '📖',
    Finanzas: '💰',
    Legal: '📜',
    Seguridad: '🔒',
    Otro: '📄',
};

const types = ['Acta', 'Reglamento', 'Finanzas', 'Legal', 'Seguridad', 'Otro'];
const folders: DocumentFolder[] = ['Actas', 'Documentos relativos', 'Documentos contables', 'General'];

const toStoreDocuments = (documents: CommunityDocument[]) =>
    documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        type: doc.doc_type,
        date: new Date(doc.created_at).toLocaleDateString('es-CL'),
        emoji: EMOJIS[doc.doc_type] || '📄',
        folder: doc.folder,
    }));

export default function AdminDocumentsScreen() {
    const { organizationId, user } = useAuth();
    const setDocuments = useAppStore(s => s.setDocuments);
    const [documents, setRemoteDocuments] = useState<CommunityDocument[]>([]);
    const [showUpload, setShowUpload] = useState(false);
    const [title, setTitle] = useState('');
    const [docType, setDocType] = useState('Acta');
    const [selectedFolder, setSelectedFolder] = useState<DocumentFolder>('Actas');
    const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        loadDocuments();
    }, [organizationId]);

    const loadDocuments = async () => {
        if (!organizationId) return;
        setLoading(true);
        try {
            const data = await documentService.getDocuments(organizationId);
            setRemoteDocuments(data);
            setDocuments(toStoreDocuments(data) as any);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudieron cargar los documentos.');
        } finally {
            setLoading(false);
        }
    };

    const groupedDocs = useMemo(() => (
        documents.reduce((acc, doc) => {
            const folder = doc.folder || 'General';
            if (!acc[folder]) acc[folder] = [];
            acc[folder].push(doc);
            return acc;
        }, {} as Record<string, CommunityDocument[]>)
    ), [documents]);

    const pickDocument = async () => {
        const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
        if (!result.canceled && result.assets[0]) {
            setSelectedFile(result.assets[0]);
        }
    };

    const resetForm = () => {
        setShowUpload(false);
        setTitle('');
        setDocType('Acta');
        setSelectedFolder('Actas');
        setSelectedFile(null);
    };

    const handleUpload = async () => {
        if (!organizationId || !user) {
            Alert.alert('Error', 'No se pudo resolver tu organización o usuario.');
            return;
        }
        if (!title.trim() || !selectedFile) {
            Alert.alert('Error', 'Completa el título y selecciona un archivo.');
            return;
        }

        setLoading(true);
        try {
            const filePath = await documentService.uploadDocument({
                organizationId,
                folder: selectedFolder,
                fileName: selectedFile.name,
                fileUri: selectedFile.uri,
                mimeType: selectedFile.mimeType,
            });

            await documentService.createDocument({
                organization_id: organizationId,
                title: title.trim(),
                doc_type: docType,
                file_path: filePath,
                description: null,
                created_by: user.id,
                is_public: true,
                folder: selectedFolder,
                original_file_name: selectedFile.name,
                mime_type: selectedFile.mimeType || null,
                file_size_bytes: selectedFile.size || null,
            });

            await loadDocuments();
            Alert.alert('Documento subido', `"${title}" quedó disponible para tu comunidad.`);
            resetForm();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo subir el documento.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (doc: CommunityDocument) => {
        Alert.alert('Eliminar documento', `¿Estás seguro de eliminar "${doc.title}"?`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    setLoading(true);
                    try {
                        await documentService.deleteDocument(doc.id, doc.file_path);
                        await loadDocuments();
                    } catch (error: any) {
                        Alert.alert('Error', error.message || 'No se pudo eliminar el documento.');
                    } finally {
                        setLoading(false);
                    }
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <Text style={s.title}>Gestionar Documentos</Text>
                <TouchableOpacity style={s.uploadBtn} onPress={() => showUpload ? resetForm() : setShowUpload(true)}>
                    <Text style={s.uploadBtnText}>{showUpload ? 'Cancelar' : 'Subir Documento'}</Text>
                </TouchableOpacity>
                {loading && <ActivityIndicator color="#2563EB" style={{ marginBottom: 12 }} />}

                {showUpload && (
                    <View style={s.form}>
                        <Text style={s.label}>Título del documento</Text>
                        <TextInput style={s.input} placeholder="Ej: Acta Reunión Marzo" placeholderTextColor="#94A3B8" value={title} onChangeText={setTitle} />

                        <Text style={s.label}>Carpeta de destino</Text>
                        <View style={s.typeRow}>
                            {folders.map(folder => (
                                <TouchableOpacity key={folder} style={[s.folderChip, selectedFolder === folder && s.typeChipActive]} onPress={() => setSelectedFolder(folder)}>
                                    <Text style={[s.typeChipText, selectedFolder === folder && s.typeChipTextActive]}>{folder}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={s.label}>Categoría / Tipo</Text>
                        <View style={s.typeRow}>
                            {types.map(type => (
                                <TouchableOpacity key={type} style={[s.typeChip, docType === type && s.typeChipActive]} onPress={() => setDocType(type)}>
                                    <Text style={[s.typeChipText, docType === type && s.typeChipTextActive]}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={s.label}>Archivo</Text>
                        <TouchableOpacity style={s.fileBtn} onPress={pickDocument}>
                            <Text style={s.fileBtnText}>{selectedFile?.name || 'Seleccionar archivo...'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.submitBtn} onPress={handleUpload} disabled={loading}>
                            <Text style={s.submitBtnText}>Publicar Documento</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={s.section}>Documentos publicados ({documents.length})</Text>
                {Object.keys(groupedDocs).length === 0 && !loading ? (
                    <View style={s.empty}><Text style={s.emptyText}>No hay documentos publicados.</Text></View>
                ) : (
                    Object.keys(groupedDocs).map(folder => (
                        <View key={folder}>
                            <Text style={s.folderHeader}>📁 {folder}</Text>
                            {groupedDocs[folder].map(doc => (
                                <View key={doc.id} style={s.card}>
                                    <Text style={s.emoji}>{EMOJIS[doc.doc_type] || '📄'}</Text>
                                    <View style={s.info}>
                                        <Text style={s.docTitle}>{doc.title}</Text>
                                        <Text style={s.meta}>{doc.doc_type} • {new Date(doc.created_at).toLocaleDateString('es-CL')}</Text>
                                        <Text style={s.fileMeta}>{doc.original_file_name || 'Archivo'}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDelete(doc)}><Text style={s.delete}>🗑️</Text></TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    ))
                )}
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
    fileMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
    delete: { fontSize: 18 },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 16, color: '#94A3B8' },
});
