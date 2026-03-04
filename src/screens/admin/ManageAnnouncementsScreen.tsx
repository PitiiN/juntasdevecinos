import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppStore } from '../../lib/store';
import { pushService } from '../../services/pushService';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const YEARS: number[] = [];
for (let y = 2020; y <= 2040; y++) YEARS.push(y);

export default function ManageAnnouncementsScreen() {
    const { announcements, addAnnouncement, removeAnnouncement, updateAnnouncement, polls, addPoll, removePoll } = useAppStore();
    const [showForm, setShowForm] = useState(false);
    const [formType, setFormType] = useState<'aviso' | 'encuesta'>('aviso');
    const [editId, setEditId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [location, setLocation] = useState('');
    const [schedule, setSchedule] = useState('');
    const [priority, setPriority] = useState<'normal' | 'important'>('normal');

    // Expiry field
    const [expiresAtDate, setExpiresAtDate] = useState<Date | null>(null);
    const [noExpiry, setNoExpiry] = useState(true); // "No aplica" by default
    const [showExpiryPicker, setShowExpiryPicker] = useState(false);

    // Poll fields
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
    const [pollDeadline, setPollDeadline] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [sendPush, setSendPush] = useState(false);

    // Month/Year filter
    const now = new Date();
    const [filterMonth, setFilterMonth] = useState(now.getMonth());
    const [filterYear, setFilterYear] = useState(now.getFullYear());
    const [showYearPicker, setShowYearPicker] = useState(false);
    const yearScrollRef = React.useRef<ScrollView>(null);

    // Historical toggle
    const [showHistoricAvisos, setShowHistoricAvisos] = useState(false);
    const [showHistoricPolls, setShowHistoricPolls] = useState(false);

    const isExpiredAviso = (a: any) => {
        if (!a.expiresAt) return false;
        return new Date() > new Date(a.expiresAt);
    };
    const isExpiredPoll = (p: any) => new Date() > new Date(p.deadline);

    const activeAvisos = announcements.filter(a => !isExpiredAviso(a));
    const historicAvisos = announcements.filter(a => isExpiredAviso(a));
    const activePolls = polls.filter(p => !isExpiredPoll(p));
    const historicPolls = polls.filter(p => isExpiredPoll(p));

    const startEdit = (a: any) => {
        setEditId(a.id); setTitle(a.title); setBody(a.body); setPriority(a.priority);
        setLocation(a.location || ''); setSchedule(a.schedule || '');
        if (a.expiresAt) { setNoExpiry(false); setExpiresAtDate(new Date(a.expiresAt)); } else { setNoExpiry(true); setExpiresAtDate(null); }
        setSendPush(false); setShowForm(true); setFormType('aviso');
    };

    const handleSave = async () => {
        if (formType === 'aviso') {
            if (!title.trim() || !body.trim()) { Alert.alert('Error', 'Completa título y contenido.'); return; }
            const expiresAt = noExpiry ? null : (expiresAtDate ? expiresAtDate.toISOString() : null);
            if (editId) {
                updateAnnouncement(editId, { title, body, priority, location, schedule, expiresAt });
                Alert.alert('✅ Aviso actualizado');
            } else {
                addAnnouncement({ title, body, priority, location, schedule, expiresAt });
                if (sendPush) await pushService.broadcastPushNotification(`📣 ${title}`, body, { type: 'announcement' });
                Alert.alert('✅ Aviso publicado', sendPush ? 'Se ha enviado Notificación Push.' : '');
            }
        } else {
            const validOptions = pollOptions.filter(o => o.trim() !== '');
            if (!pollQuestion.trim() || validOptions.length < 2 || !pollDeadline.trim()) {
                Alert.alert('Error', 'Completa la pregunta, fecha límite y al menos 2 opciones.'); return;
            }
            addPoll({
                question: pollQuestion,
                deadline: pollDeadline,
                options: validOptions.map(text => ({ id: Math.random().toString(), text, votes: 0 })),
                pushEnabled: sendPush
            });
            if (sendPush) await pushService.broadcastPushNotification(`📊 Nueva Encuesta`, pollQuestion, { type: 'poll' });
            Alert.alert('✅ Encuesta publicada', sendPush ? 'Se ha enviado Notificación Push.' : '');
        }
        cancelForm();
    };

    const handleDelete = (id: string, name: string, isPoll = false) => {
        Alert.alert('¿Eliminar?', `"${name}" será eliminado permanentemente.`, [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Eliminar', style: 'destructive', onPress: () => isPoll ? removePoll(id) : removeAnnouncement(id) },
        ]);
    };

    const cancelForm = () => {
        setShowForm(false); setEditId(null); setTitle(''); setBody(''); setLocation(''); setSchedule(''); setPriority('normal');
        setPollQuestion(''); setPollOptions(['', '']); setPollDeadline('');
        setSendPush(false); setNoExpiry(true); setExpiresAtDate(null);
    };

    const prevMonth = () => {
        if (filterMonth === 0) { setFilterMonth(11); setFilterYear(y => y - 1); } else { setFilterMonth(m => m - 1); }
    };
    const nextMonth = () => {
        if (filterMonth === 11) { setFilterMonth(0); setFilterYear(y => y + 1); } else { setFilterMonth(m => m + 1); }
    };

    const renderAvisoCard = (a: any) => (
        <View key={a.id} style={s.card}>
            <Text style={s.cardTitle}>{a.title}</Text>
            {(a.schedule || a.location) && (
                <Text style={s.cardMeta}>
                    {a.schedule && `🗓 ${a.schedule}`} {a.schedule && a.location && ' • '} {a.location && `📍 ${a.location}`}
                </Text>
            )}
            <Text style={s.cardBody} numberOfLines={2}>{a.body}</Text>
            {a.expiresAt && <Text style={{ fontSize: 11, color: '#F59E0B', marginTop: 2 }}>⏰ Caduca: {new Date(a.expiresAt).toLocaleDateString('es-CL')}</Text>}
            <View style={s.cardFooter}>
                <View style={[s.pBadge, { backgroundColor: a.priority === 'important' ? '#FEF2F2' : '#F0FDF4' }]}>
                    <Text style={{ color: a.priority === 'important' ? '#EF4444' : '#22C55E', fontSize: 11, fontWeight: '600' }}>
                        {a.priority === 'important' ? '🔴 Importante' : '🟢 Normal'}
                    </Text>
                </View>
                <View style={s.cardActions}>
                    <TouchableOpacity onPress={() => startEdit(a)} style={s.editBtn}><Text style={s.editText}>✏️</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(a.id, a.title)} style={s.deleteBtn}><Text style={s.deleteText}>🗑️</Text></TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <Text style={s.title}>📢 Gestionar Avisos</Text>

                {/* Year dropdown */}
                <TouchableOpacity style={s.yearDropdown} onPress={() => setShowYearPicker(true)}>
                    <Text style={s.yearDropdownText}>📅 {filterYear}</Text>
                    <Text style={s.yearDropdownArrow}>▾</Text>
                </TouchableOpacity>

                {/* Month pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.monthScroll}>
                    {MONTHS_SHORT.map((m, i) => (
                        <TouchableOpacity key={i} style={[s.pill, filterMonth === i && s.pillActive]} onPress={() => setFilterMonth(i)}>
                            <Text style={[s.pillText, filterMonth === i && s.pillTextActive]}>{m}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <TouchableOpacity style={s.newBtn} onPress={() => showForm ? cancelForm() : setShowForm(true)}>
                    <Text style={s.newBtnText}>{showForm ? '✕ Cancelar' : '+ Nuevo Aviso'}</Text>
                </TouchableOpacity>

                {showForm && (
                    <View style={s.form}>
                        <View style={s.typeSelector}>
                            <TouchableOpacity style={[s.typeBtn, formType === 'aviso' && s.typeActive]} onPress={() => setFormType('aviso')}>
                                <Text style={[s.typeText, formType === 'aviso' && s.typeTextActive]}>📢 Aviso</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.typeBtn, formType === 'encuesta' && s.typeActive]} onPress={() => setFormType('encuesta')}>
                                <Text style={[s.typeText, formType === 'encuesta' && s.typeTextActive]}>📊 Encuesta</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={s.formTitle}>{editId ? '✏️ Editar Publicación' : `📝 nuev${formType === 'aviso' ? 'o Aviso' : 'a Encuesta'}`}</Text>

                        {formType === 'aviso' ? (
                            <>
                                <Text style={s.label}>Título</Text>
                                <TextInput style={s.input} placeholder="Título del aviso" placeholderTextColor="#94A3B8" value={title} onChangeText={setTitle} />

                                <Text style={s.label}>Fecha y Horario</Text>
                                <TextInput style={s.input} placeholder="Ej: Sábado a las 10:00 hrs" placeholderTextColor="#94A3B8" value={schedule} onChangeText={setSchedule} />

                                <Text style={s.label}>Lugar</Text>
                                <TextInput style={s.input} placeholder="Ej: Sede Vecinal" placeholderTextColor="#94A3B8" value={location} onChangeText={setLocation} />

                                <Text style={s.label}>Contenido</Text>
                                <TextInput style={[s.input, s.multiline]} placeholder="Escribe el contenido..." placeholderTextColor="#94A3B8" value={body} onChangeText={setBody} multiline numberOfLines={4} textAlignVertical="top" />

                                <Text style={s.label}>Prioridad</Text>
                                <View style={s.prioRow}>
                                    <TouchableOpacity style={[s.prioChip, priority === 'normal' && s.prioActive]} onPress={() => setPriority('normal')}>
                                        <Text style={[s.prioText, priority === 'normal' && s.prioTextActive]}>🟢 Normal</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[s.prioChip, priority === 'important' && s.prioImportant]} onPress={() => setPriority('important')}>
                                        <Text style={[s.prioText, priority === 'important' && s.prioTextActive]}>🔴 Importante</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={s.label}>Fecha de caducidad</Text>
                                <View style={s.expiryRow}>
                                    <Text style={{ fontSize: 14, color: '#64748B', flex: 1 }}>No aplica (siempre visible)</Text>
                                    <Switch value={noExpiry} onValueChange={(val) => { setNoExpiry(val); if (val) setExpiresAtDate(null); }} trackColor={{ false: '#CBD5E1', true: '#22C55E' }} thumbColor="#FFFFFF" />
                                </View>
                                {!noExpiry && (
                                    <>
                                        <TouchableOpacity style={[s.input, { justifyContent: 'center', marginTop: 8 }]} onPress={() => setShowExpiryPicker(true)}>
                                            <Text style={{ color: expiresAtDate ? '#0F172A' : '#94A3B8' }}>
                                                {expiresAtDate ? `📅 ${expiresAtDate.toLocaleDateString('es-CL')}` : 'Seleccionar fecha de caducidad...'}
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
                                                    if (selectedDate) setExpiresAtDate(selectedDate);
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <Text style={s.label}>Pregunta</Text>
                                <TextInput style={s.input} placeholder="¿Qué día prefieres para la reunión?" placeholderTextColor="#94A3B8" value={pollQuestion} onChangeText={setPollQuestion} />
                                <Text style={s.label}>Fecha Límite (Deadline)</Text>
                                <TouchableOpacity style={[s.input, { justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
                                    <Text style={{ color: pollDeadline ? '#0F172A' : '#94A3B8' }}>{pollDeadline || 'Seleccionar fecha límite...'}</Text>
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={pollDeadline ? new Date(pollDeadline) : new Date(Date.now() + 86400000)}
                                        mode="date"
                                        display="default"
                                        minimumDate={new Date()}
                                        onChange={(event, selectedDate) => {
                                            setShowDatePicker(false);
                                            if (selectedDate) setPollDeadline(selectedDate.toISOString().split('T')[0]);
                                        }}
                                    />
                                )}
                                <Text style={s.label}>Opciones</Text>
                                {pollOptions.map((opt, i) => (
                                    <TextInput key={i} style={[s.input, { marginBottom: 8 }]} placeholder={`Opción ${i + 1}`} placeholderTextColor="#94A3B8" value={opt} onChangeText={(text) => {
                                        const newOpts = [...pollOptions]; newOpts[i] = text; setPollOptions(newOpts);
                                    }} />
                                ))}
                                <TouchableOpacity onPress={() => setPollOptions([...pollOptions, ''])}>
                                    <Text style={{ color: '#2563EB', fontWeight: 'bold', marginTop: 4 }}>+ Añadir opción</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {!editId && (
                            <View style={s.pushToggleRow}>
                                <Text style={s.pushToggleLabel}>🔔 ¿Enviar Notificación Push a los vecinos?</Text>
                                <Switch value={sendPush} onValueChange={setSendPush} trackColor={{ false: '#CBD5E1', true: '#22C55E' }} thumbColor="#FFFFFF" />
                            </View>
                        )}

                        <TouchableOpacity style={s.submitBtn} onPress={handleSave}>
                            <Text style={s.submitText}>{editId ? '💾 Guardar Cambios' : '📤 Publicar'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Active Polls */}
                {activePolls.length > 0 && (
                    <>
                        <Text style={s.section}>📊 Encuestas Activas ({activePolls.length})</Text>
                        {activePolls.map(p => (
                            <View key={p.id} style={s.card}>
                                <Text style={s.cardTitle}>📊 {p.question}</Text>
                                <Text style={s.cardMeta}>Cierra: {p.deadline}</Text>
                                <View style={s.cardFooter}>
                                    <View style={[s.pBadge, { backgroundColor: '#EFF6FF' }]}>
                                        <Text style={{ color: '#2563EB', fontSize: 11, fontWeight: '600' }}>{p.votedBy.length} votos</Text>
                                    </View>
                                    <View style={s.cardActions}>
                                        <TouchableOpacity onPress={() => handleDelete(p.id, p.question, true)} style={s.deleteBtn}><Text style={s.deleteText}>🗑️</Text></TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </>
                )}

                {/* Active Avisos */}
                <Text style={s.section}>📢 Avisos activos ({activeAvisos.length})</Text>
                {activeAvisos.map(renderAvisoCard)}

                {/* Historic Polls */}
                {historicPolls.length > 0 && (
                    <>
                        <TouchableOpacity style={s.historicBtn} onPress={() => setShowHistoricPolls(!showHistoricPolls)}>
                            <Text style={s.historicBtnText}>{showHistoricPolls ? '▲ Ocultar' : '▼ Ver'} Encuestas Históricas ({historicPolls.length})</Text>
                        </TouchableOpacity>
                        {showHistoricPolls && historicPolls.map(p => (
                            <View key={p.id} style={[s.card, { opacity: 0.6 }]}>
                                <Text style={s.cardTitle}>📊 {p.question}</Text>
                                <Text style={s.cardMeta}>Cerrada: {p.deadline}</Text>
                                <View style={s.cardFooter}>
                                    <View style={[s.pBadge, { backgroundColor: '#F1F5F9' }]}>
                                        <Text style={{ color: '#94A3B8', fontSize: 11, fontWeight: '600' }}>{p.votedBy.length} votos</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDelete(p.id, p.question, true)} style={s.deleteBtn}><Text style={s.deleteText}>🗑️</Text></TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </>
                )}

                {/* Historic Avisos */}
                {historicAvisos.length > 0 && (
                    <>
                        <TouchableOpacity style={s.historicBtn} onPress={() => setShowHistoricAvisos(!showHistoricAvisos)}>
                            <Text style={s.historicBtnText}>{showHistoricAvisos ? '▲ Ocultar' : '▼ Ver'} Avisos Históricos ({historicAvisos.length})</Text>
                        </TouchableOpacity>
                        {showHistoricAvisos && historicAvisos.map(renderAvisoCard)}
                    </>
                )}

                {/* Year picker modal */}
                <Modal visible={showYearPicker} transparent animationType="fade">
                    <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowYearPicker(false)}>
                        <View style={s.modalContent}>
                            <Text style={s.modalTitle}>Seleccionar Año</Text>
                            <ScrollView style={{ maxHeight: 350 }} ref={yearScrollRef}
                                onLayout={() => {
                                    const idx = YEARS.indexOf(filterYear);
                                    if (idx >= 0 && yearScrollRef.current) {
                                        yearScrollRef.current.scrollTo({ y: Math.max(0, idx * 50 - 100), animated: false });
                                    }
                                }}>
                                {YEARS.map(y => (
                                    <TouchableOpacity key={y} style={[s.yearOption, filterYear === y && s.yearOptionActive]} onPress={() => { setFilterYear(y); setShowYearPicker(false); }}>
                                        <Text style={[s.yearOptionText, filterYear === y && s.yearOptionTextActive]}>{y}</Text>
                                        {filterYear === y && <Text style={s.yearCheck}>✓</Text>}
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
    safe: { flex: 1, backgroundColor: 'transparent' }, scroll: { padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 16 },
    yearDropdown: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E2E8F0', elevation: 1, marginBottom: 8 },
    yearDropdownText: { fontSize: 16, fontWeight: '600', color: '#1E3A5F' },
    yearDropdownArrow: { fontSize: 16, color: '#94A3B8' },
    monthScroll: { marginBottom: 12 },
    pill: { backgroundColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginRight: 6 },
    pillActive: { backgroundColor: '#2563EB' },
    pillText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    pillTextActive: { color: '#FFFFFF' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 300 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 16, textAlign: 'center' },
    yearOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    yearOptionActive: { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 8 },
    yearOptionText: { fontSize: 16, color: '#334155' },
    yearOptionTextActive: { fontWeight: 'bold', color: '#2563EB' },
    yearCheck: { fontSize: 16, color: '#2563EB', fontWeight: 'bold' },
    newBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
    newBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    typeSelector: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 10, padding: 4, marginBottom: 16 },
    typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    typeActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    typeText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
    typeTextActive: { color: '#0F172A' },
    form: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 20, elevation: 2 },
    formTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 8 },
    label: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6, marginTop: 10 },
    input: { backgroundColor: 'transparent', borderRadius: 10, padding: 12, fontSize: 15, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0' },
    multiline: { minHeight: 80 },
    prioRow: { flexDirection: 'row', gap: 8 },
    prioChip: { flex: 1, backgroundColor: 'transparent', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    prioActive: { backgroundColor: '#F0FDF4', borderColor: '#22C55E' },
    prioImportant: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
    prioText: { fontSize: 13, color: '#64748B' }, prioTextActive: { fontWeight: '700', color: '#0F172A' },
    expiryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    submitBtn: { backgroundColor: '#22C55E', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
    submitText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    pushToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 8, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0' },
    pushToggleLabel: { fontSize: 14, fontWeight: '600', color: '#1E3A5F', flex: 1 },
    section: { fontSize: 16, fontWeight: 'bold', color: '#64748B', marginBottom: 10, marginTop: 10 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 1 },
    cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
    cardMeta: { fontSize: 12, color: '#3B82F6', marginTop: 4, fontWeight: '500' },
    cardBody: { fontSize: 13, color: '#64748B', marginTop: 4 },
    cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    pBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    cardActions: { flexDirection: 'row', gap: 8 },
    editBtn: { padding: 6 }, editText: { fontSize: 18 },
    deleteBtn: { padding: 6 }, deleteText: { fontSize: 18 },
    historicBtn: { backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 16, marginBottom: 8 },
    historicBtnText: { color: '#64748B', fontWeight: '600', fontSize: 14 },
});
