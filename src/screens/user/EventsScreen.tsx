import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Platform, Linking, Alert, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView from 'react-native-maps';
import { CommonMap } from '../../components/CommonMap';
import { useAppStore, MapPin } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatDate(iso: string) {
    const d = new Date(iso);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return `${days[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const DEFAULT_REGION = {
    latitude: -33.4920,
    longitude: -70.6610,
    latitudeDelta: 0.015,
    longitudeDelta: 0.0121,
};

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

    // Map Popup State
    const [showMapModal, setShowMapModal] = useState(false);
    const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number; title: string } | null>(null);

    // Admin Pick Map State
    const [showAdminMapPicker, setShowAdminMapPicker] = useState(false);
    const [tempLat, setTempLat] = useState<number | null>(null);
    const [tempLng, setTempLng] = useState<number | null>(null);

    const filteredEvents = allEvents
        .filter(e => e.month === selectedMonth)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
            month: eventDate.getMonth(),
            lat: tempLat || undefined,
            lng: tempLng || undefined
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
        setTempLat(null);
        setTempLng(null);
    };

    const handleEdit = (event: any) => {
        setEditingEventId(event.id);
        setTitle(event.title);
        setLocation(event.location);
        setEmoji(event.emoji);
        setDescription(event.description || '');
        setEventDate(new Date(event.date));
        setTempLat(event.lat || null);
        setTempLng(event.lng || null);
        setShowForm(true);
    };

    const handleEventPress = (event: any) => {
        if (viewMode === 'admin') {
            handleEdit(event);
        } else {
            setViewingEvent(event);
        }
    };

    const handleOpenMaps = (event: any) => {
        if (event.lat && event.lng) {
            setMapLocation({ lat: event.lat, lng: event.lng, title: event.title });
            setShowMapModal(true);
        } else {
            // Fallback to external maps if no coordinates
            const url = Platform.select({
                ios: `maps:0,0?q=${encodeURIComponent(event.location)}`,
                android: `geo:0,0?q=${encodeURIComponent(event.location)}`
            });
            if (url) {
                Linking.canOpenURL(url).then(supported => {
                    if (supported) Linking.openURL(url);
                    else Alert.alert('Error', 'No se pudo abrir la aplicación de mapas.');
                }).catch(() => Alert.alert('Error', 'Error al abrir el mapa.'));
            }
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
                        <TextInput style={s.input} placeholder="Lugar (ej: Sede Vecinal)" value={location} onChangeText={setLocation} placeholderTextColor="#94A3B8" />
                        <TextInput style={[s.input, { minHeight: 60 }]} placeholder="Descripción (visible al pinchar)" value={description} onChangeText={setDescription} multiline textAlignVertical="top" placeholderTextColor="#94A3B8" />

                        <Text style={s.fieldLabel}>Fecha y hora</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
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

                        <TouchableOpacity style={[s.dateBtn, { borderStyle: 'dashed', marginTop: 4 }]} onPress={() => setShowAdminMapPicker(true)}>
                            <Text style={s.dateBtnText}>📍 {tempLat ? 'Ubicación seleccionada' : 'Seleccionar ubicación en mapa (opcional)'}</Text>
                        </TouchableOpacity>

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
                                <TouchableOpacity onPress={(evt) => {
                                    evt.stopPropagation();
                                    handleOpenMaps(e);
                                }}>
                                    <Text style={s.location}>📍 {e.location}</Text>
                                </TouchableOpacity>
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
                        <TouchableOpacity onPress={() => handleOpenMaps(viewingEvent)}>
                            <Text style={s.modalLocation}>📍 {viewingEvent?.location}</Text>
                        </TouchableOpacity>
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

            {/* Inline Map Modal */}
            <Modal visible={showMapModal} transparent animationType="slide">
                <View style={s.modalOverlay}>
                    <View style={[s.modalContent, { width: '90%', maxWidth: 500, height: 450, padding: 0, overflow: 'hidden' }]}>
                        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', width: '100%' }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E3A5F', textAlign: 'center' }}>📍 Ubicación del Evento</Text>
                            <Text style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>{mapLocation?.title}</Text>
                        </View>
                        <CommonMap
                            pins={mapLocation ? [{
                                id: 'event-loc',
                                title: mapLocation.title,
                                lat: mapLocation.lat,
                                lng: mapLocation.lng,
                                emoji: '📍',
                                category: 'punto_interes' as const,
                                description: ''
                            }] : []}
                        />
                        <TouchableOpacity style={{ padding: 16, backgroundColor: '#F1F5F9', width: '100%' }} onPress={() => setShowMapModal(false)}>
                            <Text style={{ color: '#2563EB', fontWeight: 'bold', textAlign: 'center' }}>Cerrar Mapa</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Admin Map Picker */}
            <Modal visible={showAdminMapPicker} transparent animationType="slide">
                <View style={s.modalOverlay}>
                    <View style={[s.modalContent, { width: '90%', maxWidth: 500, height: 550, padding: 0, overflow: 'hidden' }]}>
                        <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', width: '100%' }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1E3A5F', textAlign: 'center' }}>Seleccionar Ubicación</Text>
                            <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>Toca el mapa para situar el pin del evento</Text>
                        </View>
                        <CommonMap
                            onMapPress={(lat, lng) => {
                                setTempLat(lat);
                                setTempLng(lng);
                            }}
                            pins={tempLat && tempLng ? [{
                                id: 'picker-loc',
                                title: 'Ubicación seleccionada',
                                lat: tempLat,
                                lng: tempLng,
                                emoji: '📍',
                                category: 'punto_interes' as const,
                                description: ''
                            }] : []}
                        />
                        <View style={{ flexDirection: 'row', gap: 10, padding: 16 }}>
                            <TouchableOpacity style={[s.submitBtn, { flex: 1, backgroundColor: '#64748B' }]} onPress={() => setShowAdminMapPicker(false)}>
                                <Text style={s.submitBtnText}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
