import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAccessibility } from '../../context/AccessibilityContext';

export default function AccessibilityScreen({ navigation }: any) {
    const { fontScale, highContrast, ttsEnabled, setFontScale, setHighContrast, setTtsEnabled } = useAccessibility();

    const dynText = (base: number) => base * fontScale;
    const bg = highContrast ? '#000000' : '#F8FAFC';
    const cardBg = highContrast ? '#1A1A1A' : '#FFFFFF';
    const textPrimary = highContrast ? '#FFFFFF' : '#0F172A';
    const textSecondary = highContrast ? '#D1D5DB' : '#64748B';
    const accent = highContrast ? '#60A5FA' : '#2563EB';

    return (
        <SafeAreaView style={[s.safe, { backgroundColor: bg }]}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                    <Text style={[s.backText, { color: accent }]}>← Volver</Text>
                </TouchableOpacity>
                <Text style={[s.title, { color: highContrast ? '#FFFFFF' : '#1E3A5F', fontSize: dynText(24) }]}>
                    ☉ Accesibilidad
                </Text>
                <Text style={[s.subtitle, { color: textSecondary, fontSize: dynText(14) }]}>
                    Configura la app para una mejor experiencia
                </Text>

                {/* Font Scale */}
                <View style={[s.card, { backgroundColor: cardBg }]}>
                    <Text style={[s.cardTitle, { color: textPrimary, fontSize: dynText(16) }]}>🔤 Tamaño de texto</Text>
                    <Text style={[s.preview, { color: textPrimary, fontSize: dynText(16) }]} numberOfLines={1}>
                        Texto de ejemplo ({Math.round(fontScale * 100)}%)
                    </Text>
                    <View style={s.sliderRow}>
                        <Text style={[s.sliderLabel, { fontSize: dynText(14) }]}>A</Text>
                        <View style={s.sliderContainer}>
                            <View style={s.sliderTrack}>
                                <View style={[s.sliderFill, { width: `${((fontScale - 0.8) / 0.7) * 100}%` }]} />
                            </View>
                            <View style={s.sliderButtons}>
                                <TouchableOpacity onPress={() => setFontScale(Math.max(0.8, Math.round((fontScale - 0.1) * 10) / 10))} style={[s.sliderBtn, highContrast && { backgroundColor: '#374151' }]}>
                                    <Text style={[s.sliderBtnText, { color: accent }]}>−</Text>
                                </TouchableOpacity>
                                <Text style={[s.sliderValue, { color: textPrimary }]}>{Math.round(fontScale * 100)}%</Text>
                                <TouchableOpacity onPress={() => setFontScale(Math.min(1.5, Math.round((fontScale + 0.1) * 10) / 10))} style={[s.sliderBtn, highContrast && { backgroundColor: '#374151' }]}>
                                    <Text style={[s.sliderBtnText, { color: accent }]}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <Text style={[s.sliderLabelBig, { fontSize: dynText(22) }]}>A</Text>
                    </View>
                </View>

                {/* High Contrast */}
                <View style={[s.card, { backgroundColor: cardBg }]}>
                    <View style={s.toggleRow}>
                        <View style={s.toggleInfo}>
                            <Text style={[s.cardTitle, { color: textPrimary, fontSize: dynText(16) }]}>🌗 Alto contraste</Text>
                            <Text style={[s.desc, { color: textSecondary, fontSize: dynText(13) }]}>Mejora la visibilidad de textos y bordes</Text>
                        </View>
                        <Switch value={highContrast} onValueChange={setHighContrast} trackColor={{ true: accent }} />
                    </View>
                </View>

                {/* TTS */}
                <View style={[s.card, { backgroundColor: cardBg }]}>
                    <View style={s.toggleRow}>
                        <View style={s.toggleInfo}>
                            <Text style={[s.cardTitle, { color: textPrimary, fontSize: dynText(16) }]}>🔊 Lectura en voz alta</Text>
                            <Text style={[s.desc, { color: textSecondary, fontSize: dynText(13) }]}>Habilita los botones de audio en avisos</Text>
                        </View>
                        <Switch value={ttsEnabled} onValueChange={setTtsEnabled} trackColor={{ true: accent }} />
                    </View>
                </View>

                {/* Live preview */}
                <View style={[s.previewCard, highContrast && { backgroundColor: '#1F2937', borderColor: '#4B5563' }]}>
                    <Text style={[s.previewTitle, { color: highContrast ? '#F9FAFB' : '#1E3A5F', fontSize: dynText(16) }]}>
                        👁️ Vista previa
                    </Text>
                    <Text style={[s.previewText, { color: highContrast ? '#D1D5DB' : '#475569', fontSize: dynText(14) }]}>
                        Este texto se adapta al tamaño y contraste seleccionados. Así se verá la app con tus preferencias actuales.
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1 },
    scroll: { padding: 20 },
    back: { marginBottom: 16 },
    backText: { fontSize: 16, fontWeight: '600' },
    title: { fontWeight: 'bold', marginBottom: 4 },
    subtitle: { marginBottom: 20 },
    card: { borderRadius: 14, padding: 16, marginBottom: 12, elevation: 1 },
    cardTitle: { fontWeight: 'bold', marginBottom: 4 },
    desc: { marginTop: 2 },
    preview: { marginVertical: 8, textAlign: 'center' },
    sliderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    sliderLabel: { color: '#94A3B8', marginRight: 8 },
    sliderLabelBig: { color: '#94A3B8', marginLeft: 8 },
    sliderContainer: { flex: 1 },
    sliderTrack: { height: 6, backgroundColor: '#E2E8F0', borderRadius: 3 },
    sliderFill: { height: 6, backgroundColor: '#2563EB', borderRadius: 3 },
    sliderButtons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
    sliderBtn: { backgroundColor: '#EFF6FF', borderRadius: 8, width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    sliderBtnText: { fontSize: 20, fontWeight: 'bold' },
    sliderValue: { fontSize: 14, fontWeight: '600' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    toggleInfo: { flex: 1, marginRight: 12 },
    previewCard: { backgroundColor: '#F0F9FF', borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#BFDBFE' },
    previewTitle: { fontWeight: 'bold', marginBottom: 8 },
    previewText: { lineHeight: 22 },
});
