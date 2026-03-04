import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';

export default function DocumentsScreen({ navigation }: any) {
    const documents = useAppStore(s => s.documents);

    const handleDownload = async (doc: any) => {
        try {
            await Share.share({ message: `Descarga del documento: ${doc.title}\nTipo: ${doc.type}\nFecha: ${doc.date}\n\n(Este documento estará disponible para descarga cuando se integre el almacenamiento de archivos)`, title: doc.title });
        } catch (e) {
            Alert.alert('Error', 'No se pudo compartir el documento.');
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Text style={s.backText}>← Volver</Text></TouchableOpacity>
                <Text style={s.title}>📁 Documentos</Text>
                <Text style={s.subtitle}>Archivos compartidos por la directiva</Text>
                {documents.length === 0 ? (
                    <View style={s.empty}><Text style={s.emptyText}>No hay documentos disponibles</Text></View>
                ) : documents.map(doc => (
                    <TouchableOpacity key={doc.id} style={s.card} activeOpacity={0.7} onPress={() => handleDownload(doc)}>
                        <Text style={s.emoji}>{doc.emoji}</Text>
                        <View style={s.info}>
                            <Text style={s.docTitle}>{doc.title}</Text>
                            <View style={s.meta}><View style={s.badge}><Text style={s.badgeText}>{doc.type}</Text></View><Text style={s.date}>{doc.date}</Text></View>
                        </View>
                        <Text style={s.download}>📥</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' }, scroll: { padding: 20 },
    back: { marginBottom: 16 }, backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 4 }, subtitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    emoji: { fontSize: 28, marginRight: 12 }, info: { flex: 1 },
    docTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
    meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    badge: { backgroundColor: '#EFF6FF', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginRight: 8 },
    badgeText: { fontSize: 11, color: '#2563EB', fontWeight: '600' }, date: { fontSize: 11, color: '#94A3B8' },
    download: { fontSize: 22 }, empty: { alignItems: 'center', paddingVertical: 40 }, emptyText: { fontSize: 16, color: '#94A3B8' },
});
