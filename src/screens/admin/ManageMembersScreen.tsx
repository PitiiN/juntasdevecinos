import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../lib/store';

export default function ManageMembersScreen({ navigation }: any) {
    const members = useAppStore(s => s.members);
    const [selected, setSelected] = useState<string | null>(null);

    const handleAction = (name: string) => {
        Alert.alert(`Gestionar: ${name}`, 'Selecciona una acción:', [
            { text: 'Ver detalle', onPress: () => Alert.alert(name, `Socio activo de la UV 22\nRol: ${members.find(m => m.name === name)?.role}\nEmail: ${members.find(m => m.name === name)?.email}`) },
            { text: 'Cambiar rol', onPress: () => Alert.alert('Rol actualizado', `Se ha cambiado el rol de ${name}.`) },
            { text: 'Desactivar', style: 'destructive', onPress: () => Alert.alert('Socio desactivado', `${name} ha sido desactivado.`) },
            { text: 'Cancelar', style: 'cancel' },
        ]);
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Text style={s.backText}>← Volver</Text></TouchableOpacity>
                <Text style={s.title}>👥 Gestionar Socios</Text>
                <Text style={s.subtitle}>{members.length} socio{members.length !== 1 ? 's' : ''} registrado{members.length !== 1 ? 's' : ''}</Text>

                {members.map(m => (
                    <TouchableOpacity key={m.id} style={[s.card, selected === m.id && s.cardSelected]} onPress={() => { setSelected(m.id === selected ? null : m.id); }} activeOpacity={0.7}>
                        <View style={s.avatar}><Text style={s.avatarText}>{m.name[0]}</Text></View>
                        <View style={s.info}>
                            <Text style={s.memberName}>{m.name}</Text>
                            <Text style={s.memberEmail}>{m.email}</Text>
                            <View style={s.badges}>
                                <View style={[s.badge, { backgroundColor: '#EFF6FF' }]}><Text style={[s.badgeText, { color: '#2563EB' }]}>{m.role}</Text></View>
                                <View style={[s.badge, { backgroundColor: m.active ? '#F0FDF4' : '#FEF2F2' }]}>
                                    <Text style={[s.badgeText, { color: m.active ? '#22C55E' : '#EF4444' }]}>{m.active ? 'Activo' : 'Inactivo'}</Text>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}

                {selected && (
                    <View style={s.actions}>
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#2563EB' }]} onPress={() => handleAction(members.find(m => m.id === selected)?.name || '')}>
                            <Text style={s.actionBtnText}>👤 Ver detalle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#F59E0B' }]} onPress={() => Alert.alert('Cambiar rol', 'Función en desarrollo.')}>
                            <Text style={s.actionBtnText}>🔄 Cambiar rol</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => Alert.alert('¿Desactivar socio?', 'Esta acción se puede revertir.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Desactivar', style: 'destructive' }])}>
                            <Text style={s.actionBtnText}>🚫 Desactivar</Text>
                        </TouchableOpacity>
                    </View>
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
    card: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    cardSelected: { borderWidth: 2, borderColor: '#2563EB' },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1E3A5F', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
    info: { flex: 1 },
    memberName: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
    memberEmail: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    badges: { flexDirection: 'row', gap: 6, marginTop: 6 },
    badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '600' },
    actions: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 12, marginTop: 8, elevation: 2, gap: 8 },
    actionBtn: { borderRadius: 10, padding: 12, alignItems: 'center' },
    actionBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});
