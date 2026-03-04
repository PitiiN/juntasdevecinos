import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Modal, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import { useAppStore, MapPin } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';

const SERVICE_SUBCATEGORIES = ['Salud', 'Deporte', 'Servicios para el hogar', 'Comida', 'Otro'];

export default function NeighborhoodMapScreen({ navigation }: any) {
    const { isAdmin, viewMode, user } = useAuth();
    const mapPins = useAppStore(s => s.mapPins);
    const addMapPin = useAppStore(s => s.addMapPin);
    const removeMapPin = useAppStore(s => s.removeMapPin);
    const updateMapPin = useAppStore(s => s.updateMapPin);
    const addMapPinReview = useAppStore(s => s.addMapPinReview);
    const addSolicitud = useAppStore(s => s.addSolicitud);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showManageModal, setShowManageModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);

    // Selected Pin for viewing/reviewing
    const [reviewingPin, setReviewingPin] = useState<MapPin | null>(null);

    // Review form state
    const [reviewRating, setReviewRating] = useState(3);
    const [reviewComment, setReviewComment] = useState('');

    // Add/Edit Pin form state
    const [pinTitle, setPinTitle] = useState('');
    const [pinDesc, setPinDesc] = useState('');
    const [pinCategory, setPinCategory] = useState<'servicio' | 'punto_interes'>('servicio');
    const [pinEmoji, setPinEmoji] = useState('📍');
    const [pinSubcategory, setPinSubcategory] = useState('Otro');
    const [pinWhatsapp, setPinWhatsapp] = useState('');
    const [pinInstagram, setPinInstagram] = useState('');
    const [pinFacebook, setPinFacebook] = useState('');
    const [tappedLat, setTappedLat] = useState<number | null>(null);
    const [tappedLng, setTappedLng] = useState<number | null>(null);
    const [editingPinId, setEditingPinId] = useState<string | null>(null);

    const isActualAdmin = isAdmin && viewMode === 'admin';

    const handleMapPress = (e: any) => {
        if (e.nativeEvent.action !== 'marker-press') {
            setTappedLat(e.nativeEvent.coordinate.latitude);
            setTappedLng(e.nativeEvent.coordinate.longitude);
            setShowAddModal(true);
        }
    };

    const handleMarkerPress = (pin: MapPin) => {
        setReviewingPin(pin);
        setShowReviewModal(true);
    };

    const startEditPin = (pin: MapPin) => {
        setPinTitle(pin.title);
        setPinDesc(pin.description);
        setPinCategory(pin.category as any);
        setPinEmoji(pin.emoji);
        setPinSubcategory(pin.subcategory || 'Otro');
        setPinWhatsapp(pin.contactWhatsapp || '');
        setPinInstagram(pin.socialInstagram || '');
        setPinFacebook(pin.socialFacebook || '');
        setTappedLat(pin.lat);
        setTappedLng(pin.lng);
        setEditingPinId(pin.id);
        setShowAddModal(true);
    };

    const handleAddPin = () => {
        if (!pinTitle.trim()) { Alert.alert('Error', 'Ingresa un nombre para el pin.'); return; }
        if (tappedLat === null || tappedLng === null) { Alert.alert('Error', 'Selecciona una ubicación tocando el mapa.'); return; }

        const pinData: any = {
            title: pinTitle.trim(),
            description: pinDesc.trim() || pinTitle.trim(),
            category: pinCategory,
            lat: tappedLat, lng: tappedLng, emoji: pinEmoji,
        };
        if (pinCategory === 'servicio') {
            pinData.subcategory = pinSubcategory;
            pinData.contactWhatsapp = pinWhatsapp;
            pinData.socialInstagram = pinInstagram;
            pinData.socialFacebook = pinFacebook;
        }

        if (isActualAdmin) {
            if (editingPinId) {
                updateMapPin(editingPinId, pinData);
                Alert.alert('✅ Pin actualizado', `"${pinTitle.trim()}" ha sido actualizado.`);
            } else {
                addMapPin(pinData);
                Alert.alert('✅ Pin agregado', `"${pinTitle.trim()}" ha sido agregado al mapa.`);
            }
        } else {
            addSolicitud({
                title: `📍 Pin: ${pinTitle.trim()}`,
                description: `Solicitud de nuevo pin.\n\nNombre: ${pinTitle.trim()}\nDescripción: ${pinDesc.trim() || 'Sin descripción'}\nTipo: ${pinCategory === 'servicio' ? 'Servicio' : 'Punto de Interés'}${pinCategory === 'servicio' ? `\nCategoría: ${pinSubcategory}\nWhatsApp: ${pinWhatsapp || 'N/A'}\nInstagram: ${pinInstagram || 'N/A'}\nFacebook: ${pinFacebook || 'N/A'}` : ''}\nUbicación: ${tappedLat.toFixed(6)}, ${tappedLng.toFixed(6)}`,
                category: 'Nuevo Servicio/Oficio/Emprendimiento',
                user: user?.user_metadata?.full_name || 'Vecino',
                userEmail: user?.email || '',
                hasImage: false,
            });
            Alert.alert('📨 Solicitud enviada', 'Tu solicitud de Pin ha sido enviada al administrador.');
        }
        resetPinForm();
    };

    const resetPinForm = () => {
        setPinTitle(''); setPinDesc(''); setPinEmoji('📍'); setPinSubcategory('Otro');
        setPinWhatsapp(''); setPinInstagram(''); setPinFacebook('');
        setTappedLat(null); setTappedLng(null); setEditingPinId(null);
        setShowAddModal(false);
    };

    const handleRemovePin = (id: string, name: string) => {
        Alert.alert('¿Eliminar pin?', `"${name}" será eliminado del mapa.`, [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () => {
                    removeMapPin(id);
                    setShowManageModal(false);
                    if (reviewingPin?.id === id) setShowReviewModal(false);
                }
            },
        ]);
    };

    const handleCancelPin = () => {
        resetPinForm();
    };

    const handleSubmitReview = () => {
        if (!reviewingPin) return;
        if (!reviewComment.trim()) { Alert.alert('Error', 'Escribe un comentario.'); return; }
        addMapPinReview(reviewingPin.id, {
            userId: user?.id || 'anon',
            userName: user?.user_metadata?.full_name || 'Vecino',
            rating: reviewRating,
            comment: reviewComment.trim()
        });
        Alert.alert('✅ Reseña enviada');
        setReviewComment(''); setReviewRating(3);
        // Refresh the pin data locally to show it immediately
        const updated = mapPins.find(p => p.id === reviewingPin.id);
        if (updated) setReviewingPin({ ...updated });
    };

    const EMOJIS = ['📍', '🔧', '✂️', '🧵', '🍞', '🏪', '💇', '🔑', '🛠️', '🏫', '⛪', '🏥'];

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                    <Text style={s.backText}>← Volver</Text>
                </TouchableOpacity>
                <Text style={s.title}>🗺️ Mapa del Barrio</Text>
                <Text style={s.subtitle}>
                    {isActualAdmin ? `Toca vacío para agregar pin • ${mapPins.length} puntos` : "Toca el mapa para solicitar un pin para tu servicio"}
                </Text>
                {isActualAdmin && (
                    <View style={s.adminBtns}>
                        <TouchableOpacity style={s.managePinBtn} onPress={() => setShowManageModal(true)}>
                            <Text style={s.managePinText}>📋 Gestionar Pins ({mapPins.length})</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <View style={s.mapContainer}>
                <MapView
                    style={s.map}
                    initialRegion={{
                        latitude: -33.4920,
                        longitude: -70.6610,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.0121,
                    }}
                    onPress={handleMapPress}
                >
                    {mapPins.map(p => (
                        <Marker
                            key={p.id}
                            coordinate={{ latitude: p.lat, longitude: p.lng }}
                            onPress={() => handleMarkerPress(p)}
                            tracksViewChanges={false}
                        >
                            <View style={s.markerContainer}>
                                <Text style={s.markerEmoji}>{p.emoji || '📍'}</Text>
                            </View>
                        </Marker>
                    ))}
                </MapView>
            </View>

            {/* Add Pin Modal */}
            <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={handleCancelPin}>
                <View style={s.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCancelPin} />
                    <View style={[s.modalContent, { maxHeight: '90%' }]} onStartShouldSetResponder={() => true}>
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
                            <Text style={s.modalTitle}>{isActualAdmin ? (editingPinId ? '✏️ Editar Pin' : '📍 Nuevo Pin') : '📨 Solicitar Pin'}</Text>
                            {!isActualAdmin && <Text style={s.requestNote}>Tu solicitud será revisada por el administrador.</Text>}
                            {tappedLat !== null && (
                                <Text style={s.locationLabel}>📍 Ubicación: {tappedLat.toFixed(4)}, {tappedLng?.toFixed(4)}</Text>
                            )}
                            <View style={s.catRow}>
                                <TouchableOpacity style={[s.catBtn, pinCategory === 'servicio' && s.catBtnActive]} onPress={() => setPinCategory('servicio')}>
                                    <Text style={[s.catBtnText, pinCategory === 'servicio' && { color: '#FFF' }]}>🔧 Servicio</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.catBtn, pinCategory === 'punto_interes' && s.catBtnActive2]} onPress={() => setPinCategory('punto_interes')}>
                                    <Text style={[s.catBtnText, pinCategory === 'punto_interes' && { color: '#FFF' }]}>📍 Punto Interés</Text>
                                </TouchableOpacity>
                            </View>
                            <TextInput style={s.input} placeholder="Nombre" placeholderTextColor="#94A3B8" value={pinTitle} onChangeText={setPinTitle} />
                            {pinCategory === 'punto_interes' ? (
                                <TextInput style={[s.input, { minHeight: 60 }]} placeholder="Descripción" placeholderTextColor="#94A3B8" value={pinDesc} onChangeText={setPinDesc} multiline textAlignVertical="top" />
                            ) : (
                                <>
                                    <TextInput style={[s.input, { minHeight: 60 }]} placeholder="Descripción del servicio / emprendimiento" placeholderTextColor="#94A3B8" value={pinDesc} onChangeText={setPinDesc} multiline textAlignVertical="top" />
                                    <Text style={s.fieldSubBoxLabel}>Categoría</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                                        {SERVICE_SUBCATEGORIES.map((cat, i) => (
                                            <TouchableOpacity key={i} style={[s.subCatBtn, pinSubcategory === cat && s.subCatBtnActive]} onPress={() => setPinSubcategory(cat)}>
                                                <Text style={[s.subCatText, pinSubcategory === cat && { color: '#FFF' }]}>{cat}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                    <TextInput style={s.input} placeholder="Contacto WhatsApp (ej: +569...)" placeholderTextColor="#94A3B8" value={pinWhatsapp} onChangeText={setPinWhatsapp} keyboardType="phone-pad" />
                                    <TextInput style={s.input} placeholder="Instagram (ej: @cuenta)" placeholderTextColor="#94A3B8" value={pinInstagram} onChangeText={setPinInstagram} />
                                    <TextInput style={s.input} placeholder="Facebook (Nombre de página)" placeholderTextColor="#94A3B8" value={pinFacebook} onChangeText={setPinFacebook} />
                                </>
                            )}
                            <Text style={s.fieldSubBoxLabel}>Icono visible en el mapa:</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.emojiScroll}>
                                {EMOJIS.map((e, i) => (
                                    <TouchableOpacity key={i} style={[s.emojiBtn, pinEmoji === e && s.emojiBtnActive]} onPress={() => setPinEmoji(e)}>
                                        <Text style={s.emojiText}>{e}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity style={s.confirmBtn} onPress={handleAddPin}>
                                <Text style={s.confirmText}>{isActualAdmin ? (editingPinId ? '💾 Guardar' : '✅ Agregar Pin') : '📨 Enviar Solicitud'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCancelPin} style={s.cancelBtn}>
                                <Text style={s.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Manage Pins Modal (Admin List) */}
            <Modal visible={showManageModal} transparent animationType="fade" onRequestClose={() => setShowManageModal(false)}>
                <View style={s.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowManageModal(false)} />
                    <View style={[s.modalContent, { maxHeight: '80%' }]} onStartShouldSetResponder={() => true}>
                        <Text style={s.modalTitle}>📋 Todos los Pins ({mapPins.length})</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {mapPins.map(p => (
                                <View key={p.id} style={s.pinRow}>
                                    <Text style={s.pinEmoji}>{p.emoji}</Text>
                                    <View style={s.pinInfo}>
                                        <Text style={s.pinName}>{p.title}</Text>
                                        <Text style={s.pinCat}>{p.category === 'servicio' ? `🔧 ${p.subcategory || 'Servicio'}` : '📍 Punto de interés'}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleRemovePin(p.id, p.title)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                        <Text style={s.pinDelete}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            {mapPins.length === 0 && <Text style={s.emptyPins}>No hay pins en el mapa</Text>}
                        </ScrollView>
                        <TouchableOpacity onPress={() => setShowManageModal(false)} style={s.cancelBtn}>
                            <Text style={s.cancelText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Review / Pin Details Modal */}
            <Modal visible={showReviewModal} transparent animationType="fade" onRequestClose={() => { setShowReviewModal(false); setReviewingPin(null); }}>
                <View style={s.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => { setShowReviewModal(false); setReviewingPin(null); }} />
                    <View style={[s.modalContent, { maxHeight: '90%' }]} onStartShouldSetResponder={() => true}>
                        {reviewingPin && (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 4 }}>{reviewingPin.emoji}</Text>
                                <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1E3A5F', textAlign: 'center', marginBottom: 4 }}>{reviewingPin.title}</Text>
                                <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 16 }}>{reviewingPin.description}</Text>

                                <View style={{ backgroundColor: reviewingPin.category === 'servicio' ? '#EFF6FF' : '#F0FDF4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'center', marginBottom: 12 }}>
                                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: reviewingPin.category === 'servicio' ? '#2563EB' : '#22C55E' }}>
                                        {reviewingPin.category === 'servicio' ? `🔧 Servicio • ${reviewingPin.subcategory || 'General'}` : '📍 Punto de Interés'}
                                    </Text>
                                </View>

                                {reviewingPin.category === 'servicio' && (
                                    <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                        {reviewingPin.contactWhatsapp ? <Text style={{ fontSize: 14, color: '#334155', marginBottom: 6 }}>📱 WhatsApp: <Text style={{ fontWeight: '500', color: '#0F172A' }}>{reviewingPin.contactWhatsapp}</Text></Text> : null}
                                        {reviewingPin.socialInstagram ? <Text style={{ fontSize: 14, color: '#334155', marginBottom: 6 }}>📸 Instagram: <Text style={{ fontWeight: '500', color: '#0F172A' }}>{reviewingPin.socialInstagram}</Text></Text> : null}
                                        {reviewingPin.socialFacebook ? <Text style={{ fontSize: 14, color: '#334155' }}>📘 Facebook: <Text style={{ fontWeight: '500', color: '#0F172A' }}>{reviewingPin.socialFacebook}</Text></Text> : null}
                                        {!reviewingPin.contactWhatsapp && !reviewingPin.socialInstagram && !reviewingPin.socialFacebook && <Text style={{ fontSize: 13, color: '#94A3B8', fontStyle: 'italic', textAlign: 'center' }}>Sin información de contacto disponible</Text>}
                                    </View>
                                )}

                                {/* Admin Edit/Delete directly from the card */}
                                {isActualAdmin && (
                                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                                        <TouchableOpacity style={[s.confirmBtn, { flex: 1, backgroundColor: '#F59E0B', padding: 12, marginTop: 0 }]} onPress={() => { setShowReviewModal(false); startEditPin(reviewingPin); }}>
                                            <Text style={s.confirmText}>✏️ Editar</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[s.confirmBtn, { flex: 1, backgroundColor: '#EF4444', padding: 12, marginTop: 0 }]} onPress={() => { handleRemovePin(reviewingPin.id, reviewingPin.title); }}>
                                            <Text style={s.confirmText}>🗑️ Eliminar</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* Reviews Selection */}
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E3A5F', marginTop: 8, marginBottom: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 16 }}>⭐ Reseñas de vecinos</Text>
                                {(reviewingPin.reviews && reviewingPin.reviews.length > 0) ? (
                                    reviewingPin.reviews.map(r => (
                                        <View key={r.id} style={{ backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <Text style={{ fontWeight: '600', color: '#0F172A', fontSize: 13 }}>👤 {r.userName}</Text>
                                                <Text style={{ color: '#F59E0B', fontSize: 13 }}>{'⭐'.repeat(r.rating)}</Text>
                                            </View>
                                            <Text style={{ fontSize: 14, color: '#475569' }}>"{r.comment}"</Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text style={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 16, fontStyle: 'italic' }}>Este lugar aún no tiene reseñas. ¡Sé el primero!</Text>
                                )}

                                {/* Add review form */}
                                <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E3A5F', marginBottom: 8, textAlign: 'center' }}>¿Qué te pareció?</Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 12 }}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <TouchableOpacity key={star} onPress={() => setReviewRating(star)} style={{ paddingHorizontal: 6, paddingVertical: 4 }}>
                                                <Text style={{ fontSize: 28, color: star <= reviewRating ? '#F59E0B' : '#CBD5E1' }}>★</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <TextInput
                                        style={[s.input, { marginBottom: 12, minHeight: 60, backgroundColor: '#FFFFFF' }]}
                                        placeholder="Escribe tu opinión aquí..."
                                        placeholderTextColor="#94A3B8"
                                        value={reviewComment}
                                        onChangeText={setReviewComment}
                                        multiline
                                        textAlignVertical="top"
                                    />
                                    <TouchableOpacity style={[s.confirmBtn, { backgroundColor: '#3B82F6', marginTop: 0 }]} onPress={handleSubmitReview}>
                                        <Text style={s.confirmText}>📤 Enviar Reseña</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                        <TouchableOpacity onPress={() => { setShowReviewModal(false); setReviewingPin(null); }} style={[s.cancelBtn, { marginTop: 16 }]}>
                            <Text style={s.cancelText}>Cerrar vista de detalle</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { padding: 16, paddingBottom: 12, backgroundColor: '#F8FAFC' },
    back: { marginBottom: 8, alignSelf: 'flex-start' },
    backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F' },
    subtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },
    adminBtns: { flexDirection: 'row', gap: 8, marginTop: 12 },
    managePinBtn: { backgroundColor: '#7C3AED', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
    managePinText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
    mapContainer: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 8, backgroundColor: '#E2E8F0' },
    map: { width: '100%', height: '100%' },
    markerContainer: { backgroundColor: '#FFFFFF', padding: 6, borderRadius: 20, borderWidth: 2, borderColor: '#2563EB', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
    markerEmoji: { fontSize: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, elevation: 10 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 12, textAlign: 'center' },
    requestNote: { fontSize: 13, color: '#B45309', textAlign: 'center', marginBottom: 16, backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A' },
    locationLabel: { fontSize: 14, color: '#2563EB', marginBottom: 12, fontWeight: '600', backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8, textAlign: 'center' },
    catRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    catBtn: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
    catBtnActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
    catBtnActive2: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
    catBtnText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, fontSize: 15, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
    fieldSubBoxLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8, marginTop: 4 },
    subCatBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' },
    subCatBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
    subCatText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    emojiScroll: { marginBottom: 16 },
    emojiBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 2, borderColor: '#E2E8F0' },
    emojiBtnActive: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
    emojiText: { fontSize: 26 },
    confirmBtn: { backgroundColor: '#22C55E', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
    confirmText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    cancelBtn: { marginTop: 16, alignItems: 'center', padding: 8 },
    cancelText: { color: '#64748B', fontSize: 15, fontWeight: '600' },
    pinRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    pinEmoji: { fontSize: 24, marginRight: 12 },
    pinInfo: { flex: 1 },
    pinName: { fontSize: 15, fontWeight: 'bold', color: '#0F172A' },
    pinCat: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
    pinDelete: { fontSize: 20 },
    emptyPins: { padding: 30, textAlign: 'center', color: '#94A3B8', fontSize: 15, fontStyle: 'italic' },
});
