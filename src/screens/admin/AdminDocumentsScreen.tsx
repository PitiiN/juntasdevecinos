import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Modal,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
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
const baseFolders: DocumentFolder[] = ['Actas', 'Documentos relativos', 'Documentos contables', 'General'];

const toStoreDocuments = (documents: CommunityDocument[]) =>
    documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        type: doc.doc_type,
        date: new Date(doc.created_at).toLocaleDateString('es-CL'),
        emoji: EMOJIS[doc.doc_type] || '📄',
        folder: doc.folder,
    }));

type DocPreview = {
    title: string;
    url: string;
    mimeType: string | null;
};

export default function AdminDocumentsScreen() {
    const { organizationId, user } = useAuth();
    const setDocuments = useAppStore((state) => state.setDocuments);
    const [documents, setRemoteDocuments] = useState<CommunityDocument[]>([]);
    const [showUpload, setShowUpload] = useState(false);
    const [title, setTitle] = useState('');
    const [docType, setDocType] = useState('Acta');
    const [selectedFolder, setSelectedFolder] = useState<DocumentFolder>('Actas');
    const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
    const [listFilterFolder, setListFilterFolder] = useState<string>('Todas');
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<DocPreview | null>(null);
    const [openingPreview, setOpeningPreview] = useState(false);

    React.useEffect(() => {
        void loadDocuments();
    }, [organizationId]);

    const loadDocuments = async () => {
        if (!organizationId) {
            return;
        }

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

    const folderNames = useMemo(() => {
        const dynamic = documents
            .map((doc) => doc.folder || 'General')
            .filter(Boolean);

        return ['Todas', ...Array.from(new Set([...baseFolders, ...dynamic]))];
    }, [documents]);

    const groupedDocs = useMemo(() => {
        return documents.reduce((acc, doc) => {
            const folder = doc.folder || 'General';
            if (listFilterFolder !== 'Todas' && folder !== listFilterFolder) {
                return acc;
            }

            if (!acc[folder]) {
                acc[folder] = [];
            }
            acc[folder].push(doc);
            return acc;
        }, {} as Record<string, CommunityDocument[]>);
    }, [documents, listFilterFolder]);

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

    const handlePreview = async (doc: CommunityDocument) => {
        setOpeningPreview(true);
        try {
            const signedUrl = await documentService.getSignedUrl(doc.file_path);
            if (!signedUrl) {
                Alert.alert('Error', 'No se pudo generar la vista del documento.');
                return;
            }

            setPreview({
                title: doc.title,
                url: signedUrl,
                mimeType: doc.mime_type || null,
            });
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo abrir el documento.');
        } finally {
            setOpeningPreview(false);
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <Text style={s.title}>Gestionar Documentos</Text>
                <TouchableOpacity style={s.uploadBtn} onPress={() => (showUpload ? resetForm() : setShowUpload(true))}>
                    <Text style={s.uploadBtnText}>{showUpload ? 'Cancelar' : 'Subir documento'}</Text>
                </TouchableOpacity>
                {(loading || openingPreview) && <ActivityIndicator color="#2563EB" style={{ marginBottom: 12 }} />}

                {showUpload && (
                    <View style={s.form}>
                        <Text style={s.label}>Título del documento</Text>
                        <TextInput
                            style={s.input}
                            placeholder="Ej: Acta reunión marzo"
                            placeholderTextColor="#94A3B8"
                            value={title}
                            onChangeText={setTitle}
                        />

                        <Text style={s.label}>Carpeta de destino</Text>
                        <View style={s.typeRow}>
                            {baseFolders.map((folder) => (
                                <TouchableOpacity
                                    key={folder}
                                    style={[s.folderChip, selectedFolder === folder && s.typeChipActive]}
                                    onPress={() => setSelectedFolder(folder)}
                                >
                                    <Text style={[s.typeChipText, selectedFolder === folder && s.typeChipTextActive]}>{folder}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={s.label}>Categoría / tipo</Text>
                        <View style={s.typeRow}>
                            {types.map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[s.typeChip, docType === type && s.typeChipActive]}
                                    onPress={() => setDocType(type)}
                                >
                                    <Text style={[s.typeChipText, docType === type && s.typeChipTextActive]}>{type}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={s.label}>Archivo</Text>
                        <TouchableOpacity style={s.fileBtn} onPress={pickDocument}>
                            <Text style={s.fileBtnText}>{selectedFile?.name || 'Seleccionar archivo...'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.submitBtn} onPress={handleUpload} disabled={loading}>
                            <Text style={s.submitBtnText}>Publicar documento</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={s.section}>Subdivisión de carpetas</Text>
                <View style={s.folderGrid}>
                    {folderNames.map((folder) => {
                        const count = folder === 'Todas'
                            ? documents.length
                            : documents.filter((doc) => (doc.folder || 'General') === folder).length;

                        return (
                            <TouchableOpacity
                                key={folder}
                                style={[s.folderCard, listFilterFolder === folder && s.folderCardActive]}
                                onPress={() => setListFilterFolder(folder)}
                            >
                                <Text style={s.folderCardTitle} numberOfLines={1}>{folder}</Text>
                                <Text style={s.folderCardCount}>{count} archivo{count === 1 ? '' : 's'}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={s.section}>
                    Documentos publicados ({listFilterFolder === 'Todas' ? documents.length : documents.filter((doc) => (doc.folder || 'General') === listFilterFolder).length})
                </Text>
                {Object.keys(groupedDocs).length === 0 && !loading ? (
                    <View style={s.empty}><Text style={s.emptyText}>No hay documentos publicados.</Text></View>
                ) : (
                    Object.keys(groupedDocs).map((folder) => (
                        <View key={folder}>
                            <Text style={s.folderHeader}>📁 {folder}</Text>
                            {groupedDocs[folder].map((doc) => (
                                <View key={doc.id} style={s.card}>
                                    <Text style={s.emoji}>{EMOJIS[doc.doc_type] || '📄'}</Text>
                                    <View style={s.info}>
                                        <Text style={s.docTitle}>{doc.title}</Text>
                                        <Text style={s.meta}>{doc.doc_type} • {new Date(doc.created_at).toLocaleDateString('es-CL')}</Text>
                                        <Text style={s.fileMeta}>{doc.original_file_name || 'Archivo'}</Text>
                                    </View>
                                    <View style={s.actions}>
                                        <TouchableOpacity onPress={() => void handlePreview(doc)} style={s.actionBtn}>
                                            <Text style={s.previewText}>Ver</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDelete(doc)} style={s.actionBtn}>
                                            <Text style={s.deleteText}>Eliminar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))
                )}
            </ScrollView>

            <Modal visible={Boolean(preview)} animationType="slide" onRequestClose={() => setPreview(null)}>
                <SafeAreaView style={s.previewSafe}>
                    <View style={s.previewHeader}>
                        <Text style={s.previewTitle} numberOfLines={1}>{preview?.title || 'Documento'}</Text>
                        <TouchableOpacity onPress={() => setPreview(null)} style={s.previewCloseBtn}>
                            <Text style={s.previewCloseText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>

                    {preview?.mimeType?.startsWith('image/') ? (
                        <Image source={{ uri: preview.url }} style={s.previewImage} resizeMode="contain" />
                    ) : preview ? (
                        <WebView source={{ uri: preview.url }} startInLoadingState style={s.previewWeb} />
                    ) : null}
                </SafeAreaView>
            </Modal>
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
    folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    folderCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    folderCardActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
    folderCardTitle: { fontSize: 13, fontWeight: '700', color: '#1E3A5F' },
    folderCardCount: { fontSize: 12, color: '#64748B', marginTop: 4 },
    folderHeader: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1E3A5F',
        marginBottom: 8,
        marginTop: 16,
        backgroundColor: '#F1F5F9',
        padding: 6,
        borderRadius: 6,
    },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    emoji: { fontSize: 24, marginRight: 12 },
    info: { flex: 1 },
    docTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
    meta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    fileMeta: { fontSize: 11, color: '#64748B', marginTop: 2 },
    actions: { alignItems: 'flex-end', gap: 4 },
    actionBtn: { paddingVertical: 4 },
    previewText: { color: '#2563EB', fontWeight: '700', fontSize: 13 },
    deleteText: { color: '#DC2626', fontWeight: '700', fontSize: 12 },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 16, color: '#94A3B8' },
    previewSafe: { flex: 1, backgroundColor: '#F8FAFC' },
    previewHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
    },
    previewTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0F172A', marginRight: 10 },
    previewCloseBtn: { backgroundColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    previewCloseText: { color: '#334155', fontWeight: '700' },
    previewWeb: { flex: 1 },
    previewImage: { flex: 1, backgroundColor: '#FFFFFF' },
});
