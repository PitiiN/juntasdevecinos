import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { announcementService, CommunityAnnouncement } from '../../services/announcementService';
import { CommunityPoll, pollService } from '../../services/pollService';
import { pushService } from '../../services/pushService';

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const YEARS = Array.from({ length: 21 }, (_, index) => 2020 + index);

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

const matchesMonthAndYear = (value: string, month: number, year: number) => {
    const date = new Date(value);
    return date.getMonth() === month && date.getFullYear() === year;
};

export default function ManageAnnouncementsScreen() {
    const { organizationId, user } = useAuth();
    const setAnnouncements = useAppStore((state) => state.setAnnouncements);
    const [announcements, setRemoteAnnouncements] = useState<CommunityAnnouncement[]>([]);
    const [polls, setPolls] = useState<CommunityPoll[]>([]);
    const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
    const [loadingPolls, setLoadingPolls] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState<'aviso' | 'encuesta'>('aviso');
    const [editId, setEditId] = useState<string | null>(null);
    const [editingPollId, setEditingPollId] = useState<string | null>(null);
    const [selectedPoll, setSelectedPoll] = useState<CommunityPoll | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [location, setLocation] = useState('');
    const [schedule, setSchedule] = useState('');
    const [priority, setPriority] = useState<'normal' | 'important'>('normal');
    const [expiresAtDate, setExpiresAtDate] = useState<Date | null>(null);
    const [noExpiry, setNoExpiry] = useState(true);
    const [showExpiryPicker, setShowExpiryPicker] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
    const [pollDeadline, setPollDeadline] = useState('');
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [sendPush, setSendPush] = useState(false);
    const [showHistoricAvisos, setShowHistoricAvisos] = useState(false);
    const [showHistoricPolls, setShowHistoricPolls] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const yearScrollRef = useRef<ScrollView>(null);
    const now = new Date();
    const [filterMonth, setFilterMonth] = useState(now.getMonth());
    const [filterYear, setFilterYear] = useState(now.getFullYear());

    const loadAnnouncements = useCallback(async () => {
        if (!organizationId) {
            setRemoteAnnouncements([]);
            setAnnouncements([]);
            return;
        }

        setLoadingAnnouncements(true);
        try {
            const data = await announcementService.getAnnouncements(organizationId);
            setRemoteAnnouncements(data);
            setAnnouncements(toStoreAnnouncements(data));
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudieron cargar los avisos.');
        } finally {
            setLoadingAnnouncements(false);
        }
    }, [organizationId, setAnnouncements]);

    const loadPolls = useCallback(async () => {
        if (!organizationId) {
            setPolls([]);
            return;
        }

        setLoadingPolls(true);
        try {
            const data = await pollService.getPolls(organizationId);
            setPolls(data);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudieron cargar las encuestas.');
        } finally {
            setLoadingPolls(false);
        }
    }, [organizationId]);

    useEffect(() => {
        void loadAnnouncements();
        void loadPolls();
    }, [loadAnnouncements, loadPolls]);

    const resetForm = () => {
        setShowForm(false);
        setEditId(null);
        setEditingPollId(null);
        setFormType('aviso');
        setTitle('');
        setBody('');
        setLocation('');
        setSchedule('');
        setPriority('normal');
        setExpiresAtDate(null);
        setNoExpiry(true);
        setShowExpiryPicker(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        setPollDeadline('');
        setAllowMultiple(false);
        setShowDatePicker(false);
        setSendPush(false);
    };

    const startEdit = (announcement: CommunityAnnouncement) => {
        setEditId(announcement.id);
        setEditingPollId(null);
        setShowForm(true);
        setFormType('aviso');
        setTitle(announcement.title);
        setBody(announcement.body);
        setLocation(announcement.location || '');
        setSchedule(announcement.schedule || '');
        setPriority(announcement.priority);
        setSendPush(false);
        if (announcement.expires_at) {
            setNoExpiry(false);
            setExpiresAtDate(new Date(announcement.expires_at));
        } else {
            setNoExpiry(true);
            setExpiresAtDate(null);
        }
    };

    const startEditPoll = (poll: CommunityPoll) => {
        setEditId(null);
        setEditingPollId(poll.id);
        setShowForm(true);
        setFormType('encuesta');
        setPollQuestion(poll.question);
        setPollDeadline(new Date(poll.deadline).toISOString().split('T')[0]);
        setAllowMultiple(poll.allowMultiple);
        setPollOptions(poll.options.map((option) => option.text));
        setSendPush(false);
    };

    const filteredAnnouncements = useMemo(
        () => announcements.filter((announcement) => matchesMonthAndYear(announcement.published_at, filterMonth, filterYear)),
        [announcements, filterMonth, filterYear]
    );

    const filteredPolls = useMemo(
        () => polls.filter((poll) => matchesMonthAndYear(poll.createdAt, filterMonth, filterYear)),
        [polls, filterMonth, filterYear]
    );

    const activeAnnouncements = useMemo(
        () => filteredAnnouncements.filter((announcement) => !isAnnouncementExpired(announcement)),
        [filteredAnnouncements]
    );

    const historicAnnouncements = useMemo(
        () => filteredAnnouncements.filter((announcement) => isAnnouncementExpired(announcement)),
        [filteredAnnouncements]
    );

    const activePolls = useMemo(
        () => filteredPolls.filter((poll) => new Date() <= new Date(poll.deadline)),
        [filteredPolls]
    );

    const historicPolls = useMemo(
        () => filteredPolls.filter((poll) => new Date() > new Date(poll.deadline)),
        [filteredPolls]
    );

    const handleSave = async () => {
        if (formType === 'aviso') {
            if (!organizationId || !user) {
                Alert.alert('Error', 'No se pudo resolver tu organización o usuario.');
                return;
            }

            if (!title.trim() || !body.trim()) {
                Alert.alert('Error', 'Completa título y contenido.');
                return;
            }

            const payload = {
                title: title.trim(),
                body: body.trim(),
                priority,
                location: location.trim() || null,
                schedule: schedule.trim() || null,
                expires_at: noExpiry ? null : (expiresAtDate ? expiresAtDate.toISOString() : null),
            };

            try {
                if (editId) {
                    await announcementService.updateAnnouncement(editId, payload);
                    Alert.alert('Aviso actualizado', 'El aviso quedó actualizado.');
                } else {
                    await announcementService.createAnnouncement({
                        organization_id: organizationId,
                        created_by: user.id,
                        ...payload,
                    });

                    if (sendPush) {
                        await pushService.broadcastPushNotification({
                            organization_id: organizationId,
                            title: `Nuevo aviso: ${payload.title}`,
                            body: payload.body,
                            type: 'announcement',
                            payload: {
                                priority: payload.priority,
                                location: payload.location,
                                schedule: payload.schedule,
                            },
                        });
                    }

                    Alert.alert('Aviso publicado', 'El aviso quedó disponible para la comunidad.');
                }

                await loadAnnouncements();
                resetForm();
            } catch (error: any) {
                Alert.alert('Error', error.message || 'No se pudo guardar el aviso.');
            }
            return;
        }

        const validOptions = pollOptions.map((option) => option.trim()).filter(Boolean);
        if (!pollQuestion.trim() || validOptions.length < 2 || !pollDeadline.trim()) {
            Alert.alert('Error', 'Completa la pregunta, la fecha límite y al menos dos opciones.');
            return;
        }

        if (!organizationId || !user) {
            Alert.alert('Error', 'No se pudo resolver tu organización o usuario.');
            return;
        }

        try {
            if (editingPollId) {
                await pollService.updatePoll({
                    pollId: editingPollId,
                    question: pollQuestion.trim(),
                    deadline: new Date(pollDeadline).toISOString(),
                    allowMultiple,
                    options: validOptions,
                });
                Alert.alert('Encuesta actualizada', 'La encuesta se actualizó correctamente.');
            } else {
                await pollService.createPoll({
                    organizationId,
                    userId: user.id,
                    question: pollQuestion.trim(),
                    deadline: new Date(pollDeadline).toISOString(),
                    allowMultiple,
                    options: validOptions,
                });

                if (sendPush) {
                    await pushService.broadcastPushNotification({
                        organization_id: organizationId,
                        title: 'Nueva encuesta comunitaria',
                        body: pollQuestion.trim(),
                        type: 'poll',
                        payload: {
                            deadline: pollDeadline,
                            allowMultiple,
                        },
                    });
                }

                Alert.alert('Encuesta publicada', 'La encuesta quedó disponible para la comunidad.');
            }

            await loadPolls();
            resetForm();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo publicar la encuesta.');
        }
    };

    const handleDelete = (id: string, name: string, isPoll = false) => {
        Alert.alert('Eliminar', `"${name}" sera eliminado.`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: async () => {
                    try {
                        if (isPoll) {
                            await pollService.deletePoll(id);
                            await loadPolls();
                        } else {
                            await announcementService.deleteAnnouncement(id);
                            await loadAnnouncements();
                        }
                    } catch (error: any) {
                        Alert.alert('Error', error.message || 'No se pudo eliminar.');
                    }
                },
            },
        ]);
    };

    const renderAnnouncementCard = (announcement: CommunityAnnouncement) => (
        <View key={announcement.id} style={s.card}>
            <Text style={s.cardTitle}>{announcement.title}</Text>
            {(announcement.schedule || announcement.location) && (
                <Text style={s.cardMeta}>
                    {[announcement.schedule, announcement.location].filter(Boolean).join('  ')}
                </Text>
            )}
            <Text style={s.cardBody} numberOfLines={2}>{announcement.body}</Text>
            {announcement.expires_at && (
                <Text style={s.expiryText}>
                    Caduca: {new Date(announcement.expires_at).toLocaleDateString('es-CL')}
                </Text>
            )}
            <View style={s.cardFooter}>
                <View style={[s.priorityBadge, announcement.priority === 'important' ? s.priorityImportant : s.priorityNormal]}>
                    <Text style={[s.priorityText, announcement.priority === 'important' ? s.priorityImportantText : s.priorityNormalText]}>
                        {announcement.priority === 'important' ? 'Importante' : 'Normal'}
                    </Text>
                </View>
                <View style={s.cardActions}>
                    <TouchableOpacity onPress={() => startEdit(announcement)} style={s.actionButton}>
                        <Text style={s.actionText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(announcement.id, announcement.title)} style={s.actionButton}>
                        <Text style={[s.actionText, s.deleteText]}>Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderPollCard = (poll: CommunityPoll, historic = false) => {
        const percentage = (votes: number) => (poll.totalVotes > 0 ? Math.round((votes / poll.totalVotes) * 100) : 0);

        return (
            <View key={poll.id} style={[s.card, historic && s.historicCard]}>
                <TouchableOpacity onPress={() => setSelectedPoll(poll)} activeOpacity={0.75}>
                    <Text style={s.cardTitle}>{poll.question}</Text>
                    <Text style={s.cardMeta}>
                        {historic ? 'Cerrada' : 'Cierra'}: {new Date(poll.deadline).toLocaleDateString('es-CL')}
                    </Text>
                    <View style={s.pollSummary}>
                        {poll.options.slice(0, 3).map((option) => (
                            <Text key={option.id} style={s.pollSummaryOption}>
                                 {option.text} ({option.votes} voto{option.votes === 1 ? '' : 's'}, {percentage(option.votes)}%)
                            </Text>
                        ))}
                        {poll.options.length > 3 && (
                            <Text style={s.pollSummaryOption}> +{poll.options.length - 3} opciones más</Text>
                        )}
                    </View>
                </TouchableOpacity>
                <View style={s.cardFooter}>
                    <View style={[s.priorityBadge, historic ? s.historicBadge : s.pollBadge]}>
                        <Text style={[s.priorityText, historic ? s.historicBadgeText : s.pollBadgeText]}>
                            {poll.totalVotes} votos
                        </Text>
                    </View>
                    <View style={s.cardActions}>
                        <TouchableOpacity onPress={() => setSelectedPoll(poll)} style={s.actionButton}>
                            <Text style={s.actionText}>Detalle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => startEditPoll(poll)} style={s.actionButton}>
                            <Text style={s.actionText}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(poll.id, poll.question, true)} style={s.actionButton}>
                            <Text style={[s.actionText, s.deleteText]}>Eliminar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const loading = loadingAnnouncements || loadingPolls;

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <Text style={s.title}>Gestionar Avisos</Text>
                {loading && <ActivityIndicator color="#2563EB" style={s.loader} />}

                <TouchableOpacity style={s.yearDropdown} onPress={() => setShowYearPicker(true)}>
                    <Text style={s.yearDropdownText}>{filterYear}</Text>
                    <Text style={s.yearDropdownArrow}>v</Text>
                </TouchableOpacity>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.monthScroll}>
                    {MONTHS_SHORT.map((month, index) => (
                        <TouchableOpacity
                            key={month}
                            style={[s.pill, filterMonth === index && s.pillActive]}
                            onPress={() => setFilterMonth(index)}
                        >
                            <Text style={[s.pillText, filterMonth === index && s.pillTextActive]}>{month}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <TouchableOpacity style={s.newButton} onPress={() => (showForm ? resetForm() : setShowForm(true))}>
                    <Text style={s.newButtonText}>{showForm ? 'Cancelar' : 'Nueva publicación'}</Text>
                </TouchableOpacity>

                {showForm && (
                    <View style={s.form}>
                        <View style={s.typeSelector}>
                            <TouchableOpacity
                                style={[s.typeButton, formType === 'aviso' && s.typeButtonActive]}
                                onPress={() => setFormType('aviso')}
                            >
                                <Text style={[s.typeButtonText, formType === 'aviso' && s.typeButtonTextActive]}>Aviso</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.typeButton, formType === 'encuesta' && s.typeButtonActive]}
                                onPress={() => setFormType('encuesta')}
                            >
                                <Text style={[s.typeButtonText, formType === 'encuesta' && s.typeButtonTextActive]}>Encuesta</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={s.formTitle}>
                            {editId || editingPollId
                                ? `Editar ${formType === 'aviso' ? 'publicación' : 'encuesta'}`
                                : `Nueva ${formType === 'aviso' ? 'publicación' : 'encuesta'}`}
                        </Text>

                        {formType === 'aviso' ? (
                            <>
                                <Text style={s.label}>Título</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="Título del aviso"
                                    placeholderTextColor="#94A3B8"
                                    value={title}
                                    onChangeText={setTitle}
                                />
                                <Text style={s.label}>Fecha y horario</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="Ej: Sabado 10:00"
                                    placeholderTextColor="#94A3B8"
                                    value={schedule}
                                    onChangeText={setSchedule}
                                />
                                <Text style={s.label}>Lugar</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="Ej: Sede vecinal"
                                    placeholderTextColor="#94A3B8"
                                    value={location}
                                    onChangeText={setLocation}
                                />
                                <Text style={s.label}>Contenido</Text>
                                <TextInput
                                    style={[s.input, s.multiline]}
                                    placeholder="Escribe el contenido"
                                    placeholderTextColor="#94A3B8"
                                    value={body}
                                    onChangeText={setBody}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                                <Text style={s.label}>Prioridad</Text>
                                <View style={s.priorityRow}>
                                    <TouchableOpacity
                                        style={[s.priorityChip, priority === 'normal' && s.priorityChipActive]}
                                        onPress={() => setPriority('normal')}
                                    >
                                        <Text style={[s.priorityChipText, priority === 'normal' && s.priorityChipTextActive]}>Normal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[s.priorityChip, priority === 'important' && s.priorityChipDanger]}
                                        onPress={() => setPriority('important')}
                                    >
                                        <Text style={[s.priorityChipText, priority === 'important' && s.priorityChipTextActive]}>Importante</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text style={s.label}>Fecha de caducidad</Text>
                                <View style={s.expiryRow}>
                                    <Text style={s.expiryLabel}>No aplica</Text>
                                    <Switch
                                        value={noExpiry}
                                        onValueChange={(value) => {
                                            setNoExpiry(value);
                                            if (value) {
                                                setExpiresAtDate(null);
                                            }
                                        }}
                                        trackColor={{ false: '#CBD5E1', true: '#22C55E' }}
                                        thumbColor="#FFFFFF"
                                    />
                                </View>
                                {!noExpiry && (
                                    <>
                                        <TouchableOpacity style={[s.input, s.dateInput]} onPress={() => setShowExpiryPicker(true)}>
                                            <Text style={{ color: expiresAtDate ? '#0F172A' : '#94A3B8' }}>
                                                {expiresAtDate
                                                    ? expiresAtDate.toLocaleDateString('es-CL')
                                                    : 'Seleccionar fecha de caducidad'}
                                            </Text>
                                        </TouchableOpacity>
                                        {showExpiryPicker && (
                                            <DateTimePicker
                                                value={expiresAtDate || new Date(Date.now() + 7 * 86400000)}
                                                mode="date"
                                                display="default"
                                                minimumDate={new Date()}
                                                onChange={(_, selectedDate) => {
                                                    setShowExpiryPicker(Platform.OS === 'ios');
                                                    if (selectedDate) {
                                                        setExpiresAtDate(selectedDate);
                                                    }
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <Text style={s.label}>Pregunta</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="Pregunta de la encuesta"
                                    placeholderTextColor="#94A3B8"
                                    value={pollQuestion}
                                    onChangeText={setPollQuestion}
                                />
                                <Text style={s.label}>Fecha límite</Text>
                                <TouchableOpacity style={[s.input, s.dateInput]} onPress={() => setShowDatePicker(true)}>
                                    <Text style={{ color: pollDeadline ? '#0F172A' : '#94A3B8' }}>
                                        {pollDeadline || 'Seleccionar fecha límite'}
                                    </Text>
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={pollDeadline ? new Date(pollDeadline) : new Date(Date.now() + 86400000)}
                                        mode="date"
                                        display="default"
                                        minimumDate={new Date()}
                                        onChange={(_, selectedDate) => {
                                            setShowDatePicker(Platform.OS === 'ios');
                                            if (selectedDate) {
                                                setPollDeadline(selectedDate.toISOString().split('T')[0]);
                                            }
                                        }}
                                    />
                                )}
                                <Text style={s.label}>Opciones</Text>
                                {pollOptions.map((option, index) => (
                                    <TextInput
                                        key={`poll-opt-${index}`}
                                        style={[s.input, s.optionInput]}
                                        placeholder={`Opcion ${index + 1}`}
                                        placeholderTextColor="#94A3B8"
                                        value={option}
                                        onChangeText={(text) => {
                                            const updated = [...pollOptions];
                                            updated[index] = text;
                                            setPollOptions(updated);
                                        }}
                                    />
                                ))}
                                <TouchableOpacity onPress={() => setPollOptions([...pollOptions, ''])}>
                                    <Text style={s.addOptionText}>+ Añadir opción</Text>
                                </TouchableOpacity>
                                <View style={s.pushToggleRow}>
                                    <Text style={s.pushToggleLabel}>Permitir multiples respuestas</Text>
                                    <Switch
                                        value={allowMultiple}
                                        onValueChange={setAllowMultiple}
                                        trackColor={{ false: '#CBD5E1', true: '#22C55E' }}
                                        thumbColor="#FFFFFF"
                                    />
                                </View>
                            </>
                        )}

                        {!editId && !editingPollId && (
                            <View style={s.pushToggleRow}>
                                <Text style={s.pushToggleLabel}>Enviar notificacion push</Text>
                                <Switch
                                    value={sendPush}
                                    onValueChange={setSendPush}
                                    trackColor={{ false: '#CBD5E1', true: '#22C55E' }}
                                    thumbColor="#FFFFFF"
                                />
                            </View>
                        )}

                        <TouchableOpacity style={s.submitButton} onPress={handleSave} disabled={loading}>
                            <Text style={s.submitButtonText}>{editId || editingPollId ? 'Guardar cambios' : 'Publicar'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {activePolls.length > 0 && (
                    <>
                        <Text style={s.section}>Encuestas activas ({activePolls.length})</Text>
                        {activePolls.map((poll) => renderPollCard(poll))}
                    </>
                )}

                <Text style={s.section}>Avisos activos ({activeAnnouncements.length})</Text>
                {activeAnnouncements.map(renderAnnouncementCard)}

                {historicPolls.length > 0 && (
                    <>
                        <TouchableOpacity style={s.historicButton} onPress={() => setShowHistoricPolls((current) => !current)}>
                            <Text style={s.historicButtonText}>
                                {showHistoricPolls ? 'Ocultar' : 'Ver'} encuestas históricas ({historicPolls.length})
                            </Text>
                        </TouchableOpacity>
                        {showHistoricPolls && historicPolls.map((poll) => renderPollCard(poll, true))}
                    </>
                )}

                {historicAnnouncements.length > 0 && (
                    <>
                        <TouchableOpacity style={s.historicButton} onPress={() => setShowHistoricAvisos((current) => !current)}>
                            <Text style={s.historicButtonText}>
                                {showHistoricAvisos ? 'Ocultar' : 'Ver'} avisos históricos ({historicAnnouncements.length})
                            </Text>
                        </TouchableOpacity>
                        {showHistoricAvisos && historicAnnouncements.map(renderAnnouncementCard)}
                    </>
                )}

                <Modal visible={Boolean(selectedPoll)} transparent animationType="fade" onRequestClose={() => setSelectedPoll(null)}>
                    <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setSelectedPoll(null)}>
                        <View style={[s.modalContent, { maxWidth: 420, maxHeight: '80%' }]} onStartShouldSetResponder={() => true}>
                            <Text style={s.modalTitle}>Detalle de encuesta</Text>
                            {selectedPoll && (
                                <ScrollView>
                                    <Text style={s.pollDetailQuestion}>{selectedPoll.question}</Text>
                                    <Text style={s.pollDetailMeta}>
                                        Cierra: {new Date(selectedPoll.deadline).toLocaleDateString('es-CL')}  {selectedPoll.totalVotes} voto{selectedPoll.totalVotes === 1 ? '' : 's'}
                                    </Text>
                                    <Text style={s.pollDetailMeta}>
                                        Tipo: {selectedPoll.allowMultiple ? 'Múltiple (varias respuestas)' : 'Única respuesta'}
                                    </Text>
                                    <View style={s.pollDetailList}>
                                        {selectedPoll.options.map((option) => {
                                            const pct = selectedPoll.totalVotes > 0
                                                ? Math.round((option.votes / selectedPoll.totalVotes) * 100)
                                                : 0;
                                            return (
                                                <View key={option.id} style={s.pollDetailItem}>
                                                    <Text style={s.pollDetailItemText}>{option.text}</Text>
                                                    <Text style={s.pollDetailItemVotes}>
                                                        {option.votes} voto{option.votes === 1 ? '' : 's'} ({pct}%)
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                    <View style={s.pollDetailActions}>
                                        <TouchableOpacity
                                            style={s.pollDetailEditButton}
                                            onPress={() => {
                                                startEditPoll(selectedPoll);
                                                setSelectedPoll(null);
                                            }}
                                        >
                                            <Text style={s.pollDetailEditText}>Editar encuesta</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={s.modalCloseOnlyButton} onPress={() => setSelectedPoll(null)}>
                                            <Text style={s.modalCloseOnlyText}>Cerrar</Text>
                                        </TouchableOpacity>
                                    </View>
                                </ScrollView>
                            )}
                        </View>
                    </TouchableOpacity>
                </Modal>

                <Modal visible={showYearPicker} transparent animationType="fade">
                    <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowYearPicker(false)}>
                        <View style={s.modalContent}>
                            <Text style={s.modalTitle}>Seleccionar ano</Text>
                            <ScrollView
                                style={s.yearList}
                                ref={yearScrollRef}
                                onLayout={() => {
                                    const index = YEARS.indexOf(filterYear);
                                    if (index >= 0 && yearScrollRef.current) {
                                        yearScrollRef.current.scrollTo({
                                            y: Math.max(0, index * 48 - 96),
                                            animated: false,
                                        });
                                    }
                                }}
                            >
                                {YEARS.map((year) => (
                                    <TouchableOpacity
                                        key={year}
                                        style={[s.yearOption, filterYear === year && s.yearOptionActive]}
                                        onPress={() => {
                                            setFilterYear(year);
                                            setShowYearPicker(false);
                                        }}
                                    >
                                        <Text style={[s.yearOptionText, filterYear === year && s.yearOptionTextActive]}>{year}</Text>
                                        {filterYear === year && <Text style={s.yearCheck}>OK</Text>}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 16 },
    loader: { marginBottom: 12 },
    yearDropdown: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 8,
    },
    yearDropdownText: { fontSize: 16, fontWeight: '600', color: '#1E3A5F' },
    yearDropdownArrow: { fontSize: 16, color: '#94A3B8' },
    monthScroll: { marginBottom: 12 },
    pill: { backgroundColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginRight: 6 },
    pillActive: { backgroundColor: '#2563EB' },
    pillText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    pillTextActive: { color: '#FFFFFF' },
    newButton: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
    newButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    form: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20, elevation: 2 },
    typeSelector: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 4, marginBottom: 16 },
    typeButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    typeButtonActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    typeButtonText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
    typeButtonTextActive: { color: '#0F172A' },
    formTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 8 },
    label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6, marginTop: 10 },
    input: { backgroundColor: 'transparent', borderRadius: 10, padding: 12, fontSize: 15, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0' },
    multiline: { minHeight: 80 },
    priorityRow: { flexDirection: 'row', gap: 8 },
    priorityChip: { flex: 1, backgroundColor: 'transparent', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    priorityChipActive: { backgroundColor: '#F0FDF4', borderColor: '#22C55E' },
    priorityChipDanger: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
    priorityChipText: { fontSize: 13, color: '#64748B' },
    priorityChipTextActive: { fontWeight: '700', color: '#0F172A' },
    expiryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    expiryLabel: { fontSize: 14, color: '#64748B', flex: 1 },
    dateInput: { justifyContent: 'center', marginTop: 8 },
    optionInput: { marginBottom: 8 },
    addOptionText: { color: '#2563EB', fontWeight: 'bold', marginTop: 4 },
    pushToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 24,
        marginBottom: 8,
        padding: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    pushToggleLabel: { fontSize: 14, fontWeight: '600', color: '#1E3A5F', flex: 1 },
    submitButton: { backgroundColor: '#22C55E', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
    submitButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    section: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 10, marginTop: 10 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
    cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
    cardMeta: { fontSize: 12, color: '#3B82F6', marginTop: 4, fontWeight: '500' },
    pollSummary: { marginTop: 8 },
    pollSummaryOption: { fontSize: 12, color: '#64748B', marginBottom: 2 },
    cardBody: { fontSize: 13, color: '#64748B', marginTop: 4 },
    expiryText: { fontSize: 11, color: '#F59E0B', marginTop: 4 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    priorityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    priorityNormal: { backgroundColor: '#F0FDF4' },
    priorityImportant: { backgroundColor: '#FEF2F2' },
    priorityText: { fontSize: 11, fontWeight: '600' },
    priorityNormalText: { color: '#22C55E' },
    priorityImportantText: { color: '#EF4444' },
    pollBadge: { backgroundColor: '#EFF6FF' },
    pollBadgeText: { color: '#2563EB' },
    historicBadge: { backgroundColor: '#F1F5F9' },
    historicBadgeText: { color: '#94A3B8' },
    cardActions: { flexDirection: 'row', gap: 8 },
    actionButton: { paddingVertical: 6, paddingHorizontal: 8 },
    actionText: { fontSize: 13, fontWeight: '600', color: '#2563EB' },
    deleteText: { color: '#DC2626' },
    historicButton: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 16, marginBottom: 8 },
    historicButtonText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
    historicCard: { opacity: 0.7 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 300 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 16, textAlign: 'center' },
    pollDetailQuestion: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
    pollDetailMeta: { fontSize: 13, color: '#475569', marginBottom: 6 },
    pollDetailList: { marginTop: 10, marginBottom: 14, gap: 8 },
    pollDetailItem: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        padding: 10,
        backgroundColor: '#F8FAFC',
    },
    pollDetailItemText: { fontSize: 14, color: '#0F172A', fontWeight: '600' },
    pollDetailItemVotes: { fontSize: 12, color: '#64748B', marginTop: 3 },
    pollDetailActions: { gap: 8 },
    pollDetailEditButton: {
        backgroundColor: '#2563EB',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    pollDetailEditText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    modalCloseOnlyButton: {
        backgroundColor: '#F1F5F9',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCloseOnlyText: { color: '#334155', fontSize: 14, fontWeight: '600' },
    yearList: { maxHeight: 350 },
    yearOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    yearOptionActive: { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 8 },
    yearOptionText: { fontSize: 16, color: '#334155' },
    yearOptionTextActive: { fontWeight: 'bold', color: '#2563EB' },
    yearCheck: { fontSize: 12, color: '#2563EB', fontWeight: 'bold' },
});




