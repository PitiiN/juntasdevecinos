import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Speech from 'expo-speech';
import { Audio, Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAppStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { announcementService, CommunityAnnouncement, ReplyMediaType } from '../../services/announcementService';

type SelectedMedia = {
    uri: string;
    type: ReplyMediaType;
    fileName: string;
    mimeType?: string | null;
};

const toStoreAnnouncements = (announcements: CommunityAnnouncement[]) =>
    announcements.map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        body: announcement.body,
        priority: announcement.priority,
        date: new Date(announcement.published_at).toLocaleDateString('es-CL'),
        schedule: announcement.schedule || undefined,
        location: announcement.location || undefined,
        expiresAt: announcement.expires_at || null,
        replies: (announcement.announcement_replies || []).map((reply) => ({
            id: reply.id,
            message: reply.body,
            userName: reply.author_name,
            date: new Date(reply.created_at).toLocaleDateString('es-CL'),
            from: 'user' as const,
            mediaUrl: reply.media_url || undefined,
            mediaType: reply.media_type || undefined,
        })),
    }));

const isAnnouncementExpired = (announcement: CommunityAnnouncement) => {
    const publishedAt = new Date(announcement.published_at);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    if (publishedAt < oneMonthAgo) {
        return true;
    }

    if (!announcement.expires_at) {
        return false;
    }

    return new Date() > new Date(announcement.expires_at);
};

export default function AnnouncementsScreen() {
    const { organizationId, user } = useAuth();
    const { ttsEnabled } = useAccessibility();
    const markAvisosSeen = useAppStore((state) => state.markAvisosSeen);
    const setAnnouncementsStore = useAppStore((state) => state.setAnnouncements);
    const [announcements, setAnnouncements] = useState<CommunityAnnouncement[]>([]);
    const [loading, setLoading] = useState(false);
    const [submittingReplyId, setSubmittingReplyId] = useState<string | null>(null);
    const [speaking, setSpeaking] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [expandedThreads, setExpandedThreads] = useState<Record<string, boolean>>({});
    const [replyMessage, setReplyMessage] = useState('');
    const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
    const [recording, setRecording] = useState<Audio.Recording | null>(null);
    const [viewingMedia, setViewingMedia] = useState<{ uri: string; type: 'image' | 'video' } | null>(null);
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const [audioPlayer, setAudioPlayer] = useState<Audio.Sound | null>(null);
    const audioPlayerRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
        audioPlayerRef.current = audioPlayer;
    }, [audioPlayer]);

    const loadAnnouncements = useCallback(async (markSeen = false) => {
        if (!organizationId) {
            setAnnouncements([]);
            setAnnouncementsStore([]);
            return;
        }

        setLoading(true);
        try {
            const data = await announcementService.getAnnouncements(organizationId);
            setAnnouncements(data);
            setAnnouncementsStore(toStoreAnnouncements(data));
            if (markSeen) {
                markAvisosSeen();
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudieron cargar los avisos.');
        } finally {
            setLoading(false);
        }
    }, [organizationId, markAvisosSeen, setAnnouncementsStore]);

    useFocusEffect(
        useCallback(() => {
            void loadAnnouncements(true);
            return () => {
                Speech.stop();
                setSpeaking(null);
                if (audioPlayerRef.current) {
                    void audioPlayerRef.current.stopAsync();
                    void audioPlayerRef.current.unloadAsync();
                    setAudioPlayer(null);
                    setPlayingAudioId(null);
                }
            };
        }, [loadAnnouncements])
    );

    const getPriorityColor = (priority: string) => (priority === 'important' ? '#EF4444' : '#22C55E');

    const speak = (id: string, text: string) => {
        if (speaking === id) {
            Speech.stop();
            setSpeaking(null);
            return;
        }

        Speech.stop();
        setSpeaking(id);
        Speech.speak(text, {
            language: 'es-CL',
            rate: 0.9,
            onDone: () => setSpeaking(null),
            onError: () => {
                setSpeaking(null);
                Alert.alert('Error', 'No se pudo reproducir el audio.');
            },
        });
    };

    const toggleThread = (id: string) => {
        setExpandedThreads((current) => ({ ...current, [id]: !current[id] }));
    };

    const startRecording = async () => {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert('Permiso denegado', 'Se necesita acceso al microfono para grabar audio.');
                return;
            }

            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const result = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(result.recording);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo iniciar la grabacion.');
        }
    };

    const stopRecording = async () => {
        if (!recording) {
            return;
        }

        setRecording(null);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            if (uri) {
                setSelectedMedia({
                    uri,
                    type: 'audio',
                    fileName: `audio-${Date.now()}.m4a`,
                    mimeType: 'audio/m4a',
                });
            }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo procesar la grabacion.');
        }
    };

    const openAudioPicker = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets.length > 0) {
                const asset = result.assets[0];
                setSelectedMedia({
                    uri: asset.uri,
                    type: 'audio',
                    fileName: asset.name,
                    mimeType: asset.mimeType,
                });
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo adjuntar el audio.');
        }
    };

    const openCamera = async (type: 'image' | 'video') => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') {
            Alert.alert('Permiso denegado', 'Se necesita acceso a la camara.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: type === 'image' ? ['images'] as any : ['videos'] as any,
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];
            setSelectedMedia({
                uri: asset.uri,
                type,
                fileName: asset.fileName || `${type}-${Date.now()}`,
                mimeType: asset.mimeType,
            });
        }
    };

    const openGallery = async (type: 'image' | 'video') => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
            Alert.alert('Permiso denegado', 'Se necesita acceso a la galeria.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: type === 'image' ? ['images'] as any : ['videos'] as any,
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            const asset = result.assets[0];
            setSelectedMedia({
                uri: asset.uri,
                type,
                fileName: asset.fileName || `${type}-${Date.now()}`,
                mimeType: asset.mimeType,
            });
        }
    };

    const handleAttachMedia = (type: ReplyMediaType) => {
        if (type === 'audio') {
            Alert.alert(
                'Adjuntar audio',
                'Puedes grabar una nota de voz o subir un archivo.',
                [
                    { text: 'Grabar', onPress: startRecording },
                    { text: 'Subir archivo', onPress: openAudioPicker },
                    { text: 'Cancelar', style: 'cancel' },
                ]
            );
            return;
        }

        Alert.alert(
            `Adjuntar ${type === 'image' ? 'imagen' : 'video'}`,
            'Elige el origen del archivo.',
            [
                { text: 'Camara', onPress: () => openCamera(type) },
                { text: 'Galeria', onPress: () => openGallery(type) },
                { text: 'Cancelar', style: 'cancel' },
            ]
        );
    };

    const resetReplyComposer = () => {
        setReplyMessage('');
        setSelectedMedia(null);
        setReplyingTo(null);
    };

    const handleSendReply = async (announcementId: string) => {
        if (!organizationId || !user) {
            Alert.alert('Error', 'No se pudo resolver tu organizacion o usuario.');
            return;
        }

        if (!replyMessage.trim()) {
            Alert.alert('Error', 'Escribe un comentario antes de enviar.');
            return;
        }

        setSubmittingReplyId(announcementId);
        try {
            let mediaPath: string | null = null;
            if (selectedMedia) {
                mediaPath = await announcementService.uploadReplyMedia({
                    organizationId,
                    announcementId,
                    userId: user.id,
                    fileName: selectedMedia.fileName,
                    fileUri: selectedMedia.uri,
                    mimeType: selectedMedia.mimeType,
                });
            }

            await announcementService.addReply({
                announcement_id: announcementId,
                author_id: user.id,
                author_name: user.user_metadata?.full_name || user.email || 'Vecino',
                body: replyMessage.trim(),
                media_type: selectedMedia?.type || null,
                media_path: mediaPath,
            });

            await loadAnnouncements(true);
            resetReplyComposer();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo enviar la respuesta.');
        } finally {
            setSubmittingReplyId(null);
        }
    };

    const handlePlayAudio = async (uri: string, id: string) => {
        try {
            if (audioPlayer) {
                await audioPlayer.stopAsync();
                await audioPlayer.unloadAsync();
                setAudioPlayer(null);
                setPlayingAudioId(null);
                if (playingAudioId === id) {
                    return;
                }
            }

            const result = await Audio.Sound.createAsync({ uri });
            setAudioPlayer(result.sound);
            setPlayingAudioId(id);
            await result.sound.playAsync();
            result.sound.setOnPlaybackStatusUpdate((status) => {
                if ('didJustFinish' in status && status.didJustFinish) {
                    void result.sound.unloadAsync();
                    setAudioPlayer(null);
                    setPlayingAudioId(null);
                }
            });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'No se pudo reproducir el audio.');
        }
    };

    const activeAnnouncements = useMemo(
        () => announcements.filter((announcement) => !isAnnouncementExpired(announcement)),
        [announcements]
    );

    const importantAnnouncements = useMemo(
        () => activeAnnouncements.filter((announcement) => announcement.priority === 'important'),
        [activeAnnouncements]
    );

    const normalAnnouncements = useMemo(
        () => activeAnnouncements.filter((announcement) => announcement.priority === 'normal'),
        [activeAnnouncements]
    );

    const renderAnnouncement = (announcement: CommunityAnnouncement) => {
        const replies = announcement.announcement_replies || [];
        const isSubmitting = submittingReplyId === announcement.id;

        return (
            <View key={announcement.id} style={[s.card, { borderLeftColor: getPriorityColor(announcement.priority) }]}>
                <View style={s.row}>
                    <Text style={s.cardTitle}>{announcement.title}</Text>
                    <Text style={s.date}>{new Date(announcement.published_at).toLocaleDateString('es-CL')}</Text>
                </View>

                {(announcement.schedule || announcement.location) && (
                    <Text style={s.metaText}>
                        {[announcement.schedule, announcement.location].filter(Boolean).join(' - ')}
                    </Text>
                )}

                <Text style={s.body}>{announcement.body}</Text>

                {replies.length > 0 && (
                    <TouchableOpacity style={s.expandButton} onPress={() => toggleThread(announcement.id)}>
                        <Text style={s.expandButtonText}>
                            {expandedThreads[announcement.id]
                                ? 'Ocultar comentarios'
                                : `Ver ${replies.length} comentario${replies.length > 1 ? 's' : ''}`}
                        </Text>
                    </TouchableOpacity>
                )}

                {expandedThreads[announcement.id] && replies.length > 0 && (
                    <View style={s.repliesContainer}>
                        {replies.map((reply) => (
                            <View key={reply.id} style={s.replyBubble}>
                                <View style={s.replyHeader}>
                                    <Text style={s.replyName}>{reply.author_name}</Text>
                                    <Text style={s.replyDate}>{new Date(reply.created_at).toLocaleDateString('es-CL')}</Text>
                                </View>
                                <Text style={s.replyMessage}>{reply.body}</Text>
                                {reply.media_url && (
                                    <TouchableOpacity
                                        style={s.attachmentBadge}
                                        onPress={() => {
                                            if (reply.media_type === 'audio') {
                                                void handlePlayAudio(reply.media_url!, reply.id);
                                            } else if (reply.media_type === 'image' || reply.media_type === 'video') {
                                                setViewingMedia({ uri: reply.media_url!, type: reply.media_type });
                                            }
                                        }}
                                    >
                                        <Text style={s.attachmentBadgeText}>
                                            {reply.media_type === 'image' && 'Imagen adjunta'}
                                            {reply.media_type === 'video' && 'Video adjunto'}
                                            {reply.media_type === 'audio' && (playingAudioId === reply.id ? 'Detener audio' : 'Audio adjunto')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {(expandedThreads[announcement.id] || replies.length === 0) && replyingTo === announcement.id ? (
                    <View style={s.replyInputContainer}>
                        <View style={s.mediaButtons}>
                            <TouchableOpacity onPress={() => handleAttachMedia('image')} style={s.mediaButton}>
                                <Text>Imagen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleAttachMedia('video')} style={s.mediaButton}>
                                <Text>Video</Text>
                            </TouchableOpacity>
                            {recording ? (
                                <TouchableOpacity onPress={stopRecording} style={[s.mediaButton, s.mediaButtonDanger]}>
                                    <Text style={s.mediaButtonDangerText}>Detener voz</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity onPress={() => handleAttachMedia('audio')} style={s.mediaButton}>
                                    <Text>Audio</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <TextInput
                            style={s.replyInput}
                            placeholder="Escribe tu respuesta..."
                            value={replyMessage}
                            onChangeText={setReplyMessage}
                            multiline
                        />

                        {selectedMedia && (
                            <View style={s.selectedMediaPreview}>
                                <Text style={s.selectedMediaText}>Adjunto: {selectedMedia.type}</Text>
                                <TouchableOpacity onPress={() => setSelectedMedia(null)}>
                                    <Text style={s.removeMediaText}>Quitar</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={s.replyActions}>
                            <TouchableOpacity style={s.cancelButton} onPress={resetReplyComposer}>
                                <Text style={s.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.sendButton, isSubmitting && s.sendButtonDisabled]}
                                onPress={() => void handleSendReply(announcement.id)}
                                disabled={isSubmitting}
                            >
                                <Text style={s.sendButtonText}>{isSubmitting ? 'Enviando...' : 'Enviar'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    (expandedThreads[announcement.id] || replies.length === 0) && (
                        <TouchableOpacity style={s.startReplyButton} onPress={() => setReplyingTo(announcement.id)}>
                            <Text style={s.startReplyText}>Escribir una respuesta...</Text>
                        </TouchableOpacity>
                    )
                )}

                {ttsEnabled && (
                    <TouchableOpacity
                        style={[s.ttsButton, speaking === announcement.id && s.ttsButtonActive]}
                        onPress={() => speak(announcement.id, `${announcement.title}. ${announcement.body}`)}
                    >
                        <Text style={[s.ttsButtonText, speaking === announcement.id && s.ttsButtonTextActive]}>
                            {speaking === announcement.id ? 'Detener audio' : 'Escuchar este aviso'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.header}>
                <Text style={s.title}>Avisos</Text>
            </View>
            <ScrollView contentContainerStyle={s.scroll}>
                {loading && <Text style={s.loadingText}>Cargando avisos...</Text>}
                {!loading && activeAnnouncements.length === 0 ? (
                    <View style={s.empty}>
                        <Text style={s.emptyText}>No hay avisos por el momento</Text>
                    </View>
                ) : (
                    <>
                        {importantAnnouncements.length > 0 && <Text style={s.sectionImportant}>Avisos importantes</Text>}
                        {importantAnnouncements.map(renderAnnouncement)}

                        {normalAnnouncements.length > 0 && <Text style={s.sectionNormal}>Avisos</Text>}
                        {normalAnnouncements.map(renderAnnouncement)}
                    </>
                )}
            </ScrollView>

            {viewingMedia && (
                <Modal visible transparent animationType="fade" onRequestClose={() => setViewingMedia(null)}>
                    <View style={s.modalOverlay}>
                        <TouchableOpacity style={s.modalCloseButton} onPress={() => setViewingMedia(null)}>
                            <Text style={s.modalCloseText}>Cerrar</Text>
                        </TouchableOpacity>
                        {viewingMedia.type === 'image' ? (
                            <Image source={{ uri: viewingMedia.uri }} style={s.fullScreenMedia} resizeMode="contain" />
                        ) : (
                            <Video
                                source={{ uri: viewingMedia.uri }}
                                style={s.fullScreenMedia}
                                useNativeControls
                                resizeMode={ResizeMode.CONTAIN}
                                shouldPlay
                            />
                        )}
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 15,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F' },
    scroll: { padding: 20 },
    loadingText: { fontSize: 14, color: '#64748B', marginBottom: 12 },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 16, color: '#94A3B8' },
    sectionImportant: { fontSize: 16, fontWeight: 'bold', color: '#EF4444', marginBottom: 8 },
    sectionNormal: { fontSize: 16, fontWeight: 'bold', color: '#22C55E', marginTop: 16, marginBottom: 8 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        elevation: 2,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', flex: 1 },
    date: { fontSize: 12, color: '#94A3B8' },
    metaText: { fontSize: 13, color: '#3B82F6', fontWeight: '500', marginBottom: 6 },
    body: { fontSize: 14, color: '#475569', lineHeight: 20, marginBottom: 12 },
    expandButton: { paddingVertical: 8, marginBottom: 4 },
    expandButtonText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
    repliesContainer: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 12 },
    replyBubble: { backgroundColor: '#F8FAFC', padding: 10, borderRadius: 12, marginBottom: 8 },
    replyHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    replyName: { fontSize: 12, fontWeight: '600', color: '#334155' },
    replyDate: { fontSize: 11, color: '#94A3B8' },
    replyMessage: { fontSize: 13, color: '#475569' },
    attachmentBadge: {
        backgroundColor: '#F1F5F9',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    attachmentBadgeText: { color: '#3B82F6', fontSize: 13, fontWeight: 'bold' },
    replyInputContainer: {
        marginTop: 12,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    mediaButtons: { flexDirection: 'row', marginBottom: 8 },
    mediaButton: { backgroundColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 8 },
    mediaButtonDanger: { backgroundColor: '#FEE2E2', borderColor: '#EF4444', borderWidth: 1 },
    mediaButtonDangerText: { color: '#EF4444', fontWeight: 'bold' },
    replyInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        fontSize: 14,
        minHeight: 60,
        textAlignVertical: 'top',
        marginBottom: 8,
    },
    selectedMediaPreview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        padding: 8,
        borderRadius: 6,
        marginBottom: 8,
    },
    selectedMediaText: { fontSize: 12, color: '#475569', fontWeight: '500' },
    removeMediaText: { color: '#DC2626', fontSize: 12, fontWeight: '600' },
    replyActions: { flexDirection: 'row', justifyContent: 'flex-end' },
    cancelButton: { paddingVertical: 8, paddingHorizontal: 12, marginRight: 8 },
    cancelButtonText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
    sendButton: { backgroundColor: '#2563EB', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
    sendButtonDisabled: { opacity: 0.7 },
    sendButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
    startReplyButton: {
        backgroundColor: '#F1F5F9',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    startReplyText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
    ttsButton: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, alignItems: 'center' },
    ttsButtonActive: { backgroundColor: '#DC2626' },
    ttsButtonText: { color: '#2563EB', fontWeight: '600', fontSize: 14 },
    ttsButtonTextActive: { color: '#FFFFFF' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
    modalCloseButton: {
        position: 'absolute',
        top: 50,
        right: 30,
        zIndex: 10,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(255,255,255,0.25)',
        borderRadius: 20,
    },
    modalCloseText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    fullScreenMedia: { width: '100%', height: '80%' },
});
