import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatDate(iso: string) {
    const d = new Date(iso);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return `${days[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function EventsScreen() {
    const { user, viewMode } = useAuth();
    const navigation = useNavigation<any>();
    const allEvents = useAppStore(s => s.events);
    const addEvent = useAppStore(s => s.addEvent);
    const updateEvent = useAppStore(s => s.updateEvent);
    const removeEvent = useAppStore(s => s.removeEvent);

    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear] = useState(now.getFullYear());

    // Add/Edit Event State
    const [showForm, setShowForm] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [emoji, setEmoji] = useState('📅');
    const [description, setDescription] = useState('');
    const [eventDate, setEventDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

    // Detail popup for users
    const [viewingEvent, setViewingEvent] = useState<any>(null);

    const filteredEvents = allEvents.filter(e => e.month === selectedMonth);

    const prevMonth = () => setSelectedMonth(m => m === 0 ? 11 : m - 1);
    const nextMonth = () => setSelectedMonth(m => m === 11 ? 0 : m + 1);

    const handleSave = () => {
        if (!title || !location) return;
        const dateStr = eventDate.toISOString();
        const eventData = {
            title,
            location,
            emoji,
            description,
            date: dateStr,
            month: eventDate.getMonth()
        };

        if (editingEventId) {
            updateEvent(editingEventId, eventData);
        } else {
            addEvent(eventData);
        }

        resetForm();
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingEventId(null);
        setTitle('');
        setLocation('');
        setDescription('');
        setEmoji('📅');
        setEventDate(new Date());
    };

    const handleEdit = (event: any) => {
        setEditingEventId(event.id);
        setTitle(event.title);
        setLocation(event.location);
        setEmoji(event.emoji);
        setDescription(event.description || '');
        setEventDate(new Date(event.date));
        setShowForm(true);
    };

    const handleEventPress = (event: any) => {
        if (viewMode === 'admin') {
            handleEdit(event);
        } else {
            setViewingEvent(event);
        }
    };

    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (event.type === 'set' && selectedDate) {
            setEventDate(selectedDate);
        }
    };

    const EMOJIS = ['📅', '🎉', '🏃', '📢', '🎵', '🎨', '⚽', '🧹', '🏥', '🎓'];

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                {navigation.canGoBack() && (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 12 }}>
                        <Text style={{ color: '#2563EB', fontSize: 16, fontWeight: '600' }}>← Volver</Text>
                    </TouchableOpacity>
                )}
                <Text style={s.title}>📅 Agenda</Text>

                <View style={s.monthSelector}>
                    <TouchableOpacity onPress={prevMonth} style={s.arrowBtn}>
                        <Text style={s.arrowText}>◀</Text>
                    </TouchableOpacity>
                    <Text style={s.monthText}>📅 {MONTHS[selectedMonth]} {selectedYear}</Text>
                    <TouchableOpacity onPress={nextMonth} style={s.arrowBtn}>
                        <Text style={s.arrowText}>▶</Text>
                    </TouchableOpacity>
                </View>

                {viewMode === 'admin' && (
                    <TouchableOpacity style={s.newBtn} onPress={() => {
                        if (showForm) { resetForm(); } else { setShowForm(true); setEditingEventId(null); }
                    }}>
                        <Text style={s.newBtnText}>{showForm ? 'Cancelar' : '+ Agregar Evento'}</Text>
                    </TouchableOpacity>
                )}

                {showForm && (
                    <View style={s.form}>
                        <TextInput style={s.input} placeholder="Título" value={title} onChangeText={setTitle} placeholderTextColor="#94A3B8" />
                        <TextInput style={s.input} placeholder="Lugar" value={location} onChangeText={setLocation} placeholderTextColor="#94A3B8" />
                        <TextInput style={[s.input, { minHeight: 60 }]} placeholder="Descripción (visible al pinchar)" value={description} onChangeText={setDescription} multiline textAlignVertical="top" placeholderTextColor="#94A3B8" />

                        <Text style={s.fieldLabel}>Fecha y hora</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
                            <TouchableOpacity style={[s.dateBtn, { flex: 1, marginBottom: 0 }]} onPress={() => { setPickerMode('date'); setShowDatePicker(true); }}>
                                <Text style={s.dateBtnText}>📅 {eventDate.toLocaleDateString('es-CL')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.dateBtn, { flex: 1, marginBottom: 0 }]} onPress={() => { setPickerMode('time'); setShowDatePicker(true); }}>
                                <Text style={s.dateBtnText}>🕒 {eventDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</Text>
                            </TouchableOpacity>
                        </View>
                        {showDatePicker && (
                            <DateTimePicker value={eventDate} mode={pickerMode} display="default" onChange={handleDateChange} />
                        )}

                        <Text style={s.fieldLabel}>Emoji</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            {EMOJIS.map((e, i) => (
                                <TouchableOpacity key={i} style={[s.emojiBtn, emoji === e && s.emojiBtnActive]} onPress={() => setEmoji(e)}>
                                    <Text style={{ fontSize: 22 }}>{e}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={s.submitBtn} onPress={handleSave}>
                            <Text style={s.submitBtnText}>{editingEventId ? 'Actualizar Evento' : 'Guardar Evento'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {filteredEvents.length === 0 ? (
                    <View style={s.empty}>
                        <Text style={s.emptyEmoji}>📭</Text>
                        <Text style={s.emptyText}>No hay eventos para {MONTHS[selectedMonth]}</Text>
                    </View>
                ) : (
                    filteredEvents.map(e => (
                        <TouchableOpacity
                            key={e.id}
                            style={s.card}
                            activeOpacity={0.7}
                            onPress={() => handleEventPress(e)}
                        >
                            <Text style={s.emoji}>{e.emoji}</Text>
                            <View style={s.info}>
                                <Text style={s.cardTitle}>{e.title}</Text>
                                <Text style={s.date}>{formatDate(e.date)}</Text>
                                <Text style={s.location}>📍 {e.location}</Text>
                            </View>
                            {viewMode === 'admin' && (
                                <TouchableOpacity onPress={() => removeEvent(e.id)} style={{ padding: 10 }}>
                                    <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>

            {/* Detail popup for users */}
            <Modal visible={!!viewingEvent} transparent animationType="fade">
                <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setViewingEvent(null)}>
                    <View style={s.modalContent} onStartShouldSetResponder={() => true}>
                        <Text style={s.modalEmoji}>{viewingEvent?.emoji}</Text>
                        <Text style={s.modalTitle}>{viewingEvent?.title}</Text>
                        <Text style={s.modalDate}>📅 {viewingEvent ? formatDate(viewingEvent.date) : ''}</Text>
                        <Text style={s.modalLocation}>📍 {viewingEvent?.location}</Text>
                        {viewingEvent?.description ? (
                            <View style={s.modalDescBox}>
                                <Text style={s.modalDesc}>{viewingEvent.description}</Text>
                            </View>
                        ) : null}
                        <TouchableOpacity style={s.modalCloseBtn} onPress={() => setViewingEvent(null)}>
                            <Text style={s.modalCloseBtnText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' },
    scroll: { padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 16 },
    monthSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 16, elevation: 2 },
    arrowBtn: { padding: 8 },
    arrowText: { fontSize: 18, color: '#2563EB', fontWeight: 'bold' },
    monthText: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F' },
    newBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
    newBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    form: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2 },
    input: { backgroundColor: 'transparent', borderRadius: 10, padding: 12, fontSize: 15, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10 },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: '#64748B', marginBottom: 6 },
    dateBtn: { backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0' },
    dateBtnText: { fontSize: 15, color: '#1E3A5F' },
    emojiBtn: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 6, borderWidth: 2, borderColor: 'transparent' },
    emojiBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
    submitBtn: { backgroundColor: '#22C55E', borderRadius: 12, padding: 14, alignItems: 'center' },
    submitBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 2 },
    emoji: { fontSize: 36, marginRight: 16 },
    info: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
    date: { fontSize: 13, color: '#64748B', marginTop: 2 },
    location: { fontSize: 13, color: '#2563EB', marginTop: 2 },
    empty: { alignItems: 'center', paddingVertical: 40 },
    emptyEmoji: { fontSize: 48, marginBottom: 8 },
    emptyText: { fontSize: 16, color: '#94A3B8' },
    // Modal styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 380, alignItems: 'center' },
    modalEmoji: { fontSize: 48, marginBottom: 12 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E3A5F', textAlign: 'center', marginBottom: 8 },
    modalDate: { fontSize: 15, color: '#64748B', marginBottom: 4 },
    modalLocation: { fontSize: 15, color: '#2563EB', marginBottom: 12 },
    modalDescBox: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, width: '100%', marginBottom: 12 },
    modalDesc: { fontSize: 14, color: '#334155', lineHeight: 20 },
    modalCloseBtn: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
    modalCloseBtnText: { color: '#64748B', fontWeight: '600', fontSize: 15 },
});
