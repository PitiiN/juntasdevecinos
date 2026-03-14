import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../lib/store';
import { CommunityDocument, documentService, DocumentFolder } from '../../services/documentService';

const EMOJIS: Record<string, string> = {
    Acta: '📋',
    Reglamento: '📖',
    Finanzas: '💰',
    Legal: '📜',
    Seguridad: '🔒',
    Otro: '📄',
};

const folders: DocumentFolder[] = ['Actas', 'Documentos relativos', 'Documentos contables', 'General'];

export default function DocumentsScreen({ navigation }: any) {
    const { organizationId } = useAuth();
    const setDocuments = useAppStore(s => s.setDocuments);
    const [selectedFolder, setSelectedFolder] = React.useState<DocumentFolder | null>(null);
    const [documents, setRemoteDocuments] = React.useState<CommunityDocument[]>([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        loadDocuments();
    }, [organizationId]);

    const loadDocuments = async () => {
        if (!organizationId) return;
        setLoading(true);
        try {
            const data = await documentService.getDocuments(organizationId);
            setRemoteDocuments(data);
            setDocuments(data.map(doc => ({
                id: doc.id,
                title: doc.title,
                type: doc.doc_type,
                date: new Date(doc.created_at).toLocaleDateString('es-CL'),
                emoji: EMOJIS[doc.doc_type] || '📄',
                folder: doc.folder,
            })) as any);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudieron cargar los documentos.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (doc: CommunityDocument) => {
        try {
            const signedUrl = await documentService.getSignedUrl(doc.file_path);
            if (!signedUrl) {
                Alert.alert('Error', 'No se pudo generar el enlace del documento.');
                return;
            }

            await Share.share({
                title: doc.title,
                message: signedUrl,
                url: signedUrl,
            });
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo compartir el documento.');
        }
    };

    const filteredDocs = selectedFolder ? documents.filter(doc => (doc.folder || 'General') === selectedFolder) : [];

    const goBack = () => {
        if (selectedFolder) setSelectedFolder(null);
        else navigation.goBack();
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={goBack} style={s.back}><Text style={s.backText}>Volver</Text></TouchableOpacity>
                <Text style={s.title}>Documentos</Text>
                <Text style={s.subtitle}>{selectedFolder ? `Carpeta: ${selectedFolder}` : 'Archivos compartidos por la directiva'}</Text>
                {loading && <ActivityIndicator color="#2563EB" style={{ marginBottom: 12 }} />}

                {!selectedFolder ? (
                    <View style={s.folderRow}>
                        {folders.map(folder => (
                            <TouchableOpacity key={folder} style={s.folderCard} onPress={() => setSelectedFolder(folder)}>
                                <Text style={s.folderEmoji}>📁</Text>
                                <Text style={s.folderName}>{folder}</Text>
                                <Text style={s.folderCount}>{documents.filter(doc => (doc.folder || 'General') === folder).length} archivos</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <>
                        {filteredDocs.length === 0 ? (
                            <View style={s.empty}><Text style={s.emptyText}>No hay documentos en esta carpeta</Text></View>
                        ) : filteredDocs.map(doc => (
                            <TouchableOpacity key={doc.id} style={s.card} activeOpacity={0.7} onPress={() => handleDownload(doc)}>
                                <Text style={s.emoji}>{EMOJIS[doc.doc_type] || '📄'}</Text>
                                <View style={s.info}>
                                    <Text style={s.docTitle}>{doc.title}</Text>
                                    <View style={s.meta}>
                                        <View style={s.badge}><Text style={s.badgeText}>{doc.doc_type}</Text></View>
                                        <Text style={s.date}>{new Date(doc.created_at).toLocaleDateString('es-CL')}</Text>
                                    </View>
                                    <Text style={s.fileName}>{doc.original_file_name || 'Documento'}</Text>
                                </View>
                                <Text style={s.download}>📥</Text>
                            </TouchableOpacity>
                        ))}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 20 },
    back: { marginBottom: 16 },
    backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 4 },
    subtitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },
    folderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    folderCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', elevation: 2, marginBottom: 4 },
    folderEmoji: { fontSize: 40, marginBottom: 8 },
    folderName: { fontSize: 14, fontWeight: 'bold', color: '#1E3A5F', textAlign: 'center' },
    folderCount: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    emoji: { fontSize: 28, marginRight: 12 },
    info: { flex: 1 },
    docTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
    meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    badge: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8 },
    badgeText: { fontSize: 11, color: '#2563EB', fontWeight: '600' },
    date: { fontSize: 11, color: '#94A3B8' },
    fileName: { fontSize: 11, color: '#64748B', marginTop: 4 },
    download: { fontSize: 22 },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 16, color: '#94A3B8' },
});
