import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';

export default function DocumentsScreen({ navigation }: any) {
    const documents = useAppStore(s => s.documents);
    const [selectedFolder, setSelectedFolder] = React.useState<string | null>(null);

    const handleDownload = async (doc: any) => {
        try {
            await Share.share({ message: `Descarga del documento: ${doc.title}\nTipo: ${doc.type}\nFecha: ${doc.date}\nCarpeta: ${doc.folder || 'General'}\n\n(Este documento estará disponible para descarga cuando se integre el almacenamiento de archivos)`, title: doc.title });
        } catch (e) {
            Alert.alert('Error', 'No se pudo compartir el documento.');
        }
    };

    const folders = ['Actas', 'Documentos relativos', 'Documentos contables', 'General'];
    const filteredDocs = selectedFolder ? documents.filter(d => (d.folder || 'General') === selectedFolder) : [];

    const goBack = () => {
        if (selectedFolder) setSelectedFolder(null);
        else navigation.goBack();
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={goBack} style={s.back}><Text style={s.backText}>← Volver</Text></TouchableOpacity>
                <Text style={s.title}>📁 Documentos</Text>
                <Text style={s.subtitle}>{selectedFolder ? `Carpeta: ${selectedFolder}` : 'Archivos compartidos por la directiva'}</Text>

                {!selectedFolder ? (
                    <View style={s.folderRow}>
                        {folders.map(f => (
                            <TouchableOpacity key={f} style={s.folderCard} onPress={() => setSelectedFolder(f)}>
                                <Text style={s.folderEmoji}>📁</Text>
                                <Text style={s.folderName}>{f}</Text>
                                <Text style={s.folderCount}>{documents.filter(d => (d.folder || 'General') === f).length} archivos</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <>
                        {filteredDocs.length === 0 ? (
                            <View style={s.empty}><Text style={s.emptyText}>No hay documentos en esta carpeta</Text></View>
                        ) : filteredDocs.map(doc => (
                            <TouchableOpacity key={doc.id} style={s.card} activeOpacity={0.7} onPress={() => handleDownload(doc)}>
                                <Text style={s.emoji}>{doc.emoji}</Text>
                                <View style={s.info}>
                                    <Text style={s.docTitle}>{doc.title}</Text>
                                    <View style={s.meta}><View style={s.badge}><Text style={s.badgeText}>{doc.type}</Text></View><Text style={s.date}>{doc.date}</Text></View>
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
    safe: { flex: 1, backgroundColor: 'transparent' }, scroll: { padding: 20 },
    back: { marginBottom: 16 }, backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 4 }, subtitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },
    folderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    folderCard: { width: '47%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', elevation: 2, marginBottom: 4 },
    folderEmoji: { fontSize: 40, marginBottom: 8 },
    folderName: { fontSize: 14, fontWeight: 'bold', color: '#1E3A5F', textAlign: 'center' },
    folderCount: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    emoji: { fontSize: 28, marginRight: 12 }, info: { flex: 1 },
    docTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
    meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    badge: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8 },
    badgeText: { fontSize: 11, color: '#2563EB', fontWeight: '600' }, date: { fontSize: 11, color: '#94A3B8' },
    download: { fontSize: 22 }, empty: { alignItems: 'center', paddingVertical: 40 }, emptyText: { fontSize: 16, color: '#94A3B8' },
});
