import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useAppStore } from '../../lib/store';
import { pushService } from '../../services/pushService';

export default function AdminSettingsScreen({ navigation }: any) {
    const { signOut, setViewMode, role, user, organizationId } = useAuth();
    const orgSettings = useAppStore((state) => state.orgSettings);
    const updateOrgSettings = useAppStore((state) => state.updateOrgSettings);

    const [name, setName] = useState(orgSettings.name);
    const [address, setAddress] = useState(orgSettings.address);
    const [phone, setPhone] = useState(orgSettings.phone);
    const [social, setSocial] = useState(orgSettings.social);
    const [editing, setEditing] = useState(false);

    const handleSave = () => {
        updateOrgSettings({ name, address, phone, social });
        setEditing(false);
        Alert.alert('Guardado', 'La configuracion se actualizo correctamente.');
    };

    const sendTestNotification = async () => {
        try {
            if (!user?.id || !organizationId) {
                Alert.alert('No disponible', 'Necesitas una organizacion activa para probar notificaciones.');
                return;
            }

            const result = await pushService.sendAdminPushTest({
                userId: user.id,
                organizationId,
            });

            if (result.mode === 'local-preview') {
                Alert.alert('Prueba local enviada', result.message);
                return;
            }

            if (result.mode === 'unsupported') {
                Alert.alert('Push remotas no disponibles', result.message);
                return;
            }

            Alert.alert('Push enviada', result.message);
        } catch (error: any) {
            Alert.alert('Error', 'Fallo el envio de la notificacion de prueba.\n' + (error?.message || 'Error desconocido'));
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                    <Text style={s.backText}>Volver</Text>
                </TouchableOpacity>
                <Text style={s.title}>Configuracion JJVV</Text>
                <Text style={s.subtitle}>Administra la informacion de tu organizacion</Text>

                <View style={s.card}>
                    <Text style={s.label}>Nombre de la organizacion</Text>
                    <TextInput style={s.input} value={name} onChangeText={setName} editable={editing} placeholder="Nombre JJVV" />
                </View>

                <View style={s.card}>
                    <Text style={s.label}>Direccion</Text>
                    <TextInput style={s.input} value={address} onChangeText={setAddress} editable={editing} placeholder="Direccion de la sede" />
                </View>

                <View style={s.card}>
                    <Text style={s.label}>Telefono de contacto</Text>
                    <TextInput style={s.input} value={phone} onChangeText={setPhone} editable={editing} placeholder="Ej: +56 9 1234 5678" keyboardType="phone-pad" />
                </View>

                <View style={s.card}>
                    <Text style={s.label}>Redes sociales / Web</Text>
                    <TextInput style={s.input} value={social} onChangeText={setSocial} editable={editing} placeholder="Instagram, Facebook, etc." />
                </View>

                {editing ? (
                    <View style={s.btnRow}>
                        <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                            <Text style={s.saveBtnText}>Guardar cambios</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={s.cancelBtn}
                            onPress={() => {
                                setEditing(false);
                                setName(orgSettings.name);
                                setAddress(orgSettings.address);
                                setPhone(orgSettings.phone);
                                setSocial(orgSettings.social);
                            }}
                        >
                            <Text style={s.cancelBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={s.editBtn} onPress={() => setEditing(true)}>
                        <Text style={s.editBtnText}>Editar informacion</Text>
                    </TouchableOpacity>
                )}

                <View style={s.divider} />

                <TouchableOpacity style={s.testPushBtn} onPress={sendTestNotification}>
                    <Text style={s.testPushText}>Enviar notificacion push de prueba</Text>
                </TouchableOpacity>

                {role === 'superadmin' && (
                    <TouchableOpacity style={s.actionRow} onPress={() => setViewMode('user')}>
                        <Text style={s.actionIcon}>Usuario</Text>
                        <Text style={s.actionText}>Cambiar a vista usuario</Text>
                        <Text style={s.actionArrow}>{'>'}</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={s.logoutBtn}
                    onPress={() =>
                        Alert.alert('Cerrar sesion', 'Estas seguro?', [
                            { text: 'Cancelar' },
                            { text: 'Cerrar sesion', style: 'destructive', onPress: signOut },
                        ])
                    }
                >
                    <Text style={s.logoutText}>Cerrar sesion</Text>
                </TouchableOpacity>
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
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10, elevation: 1 },
    label: { fontSize: 12, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
    input: {
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '500',
        backgroundColor: 'transparent',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    btnRow: { gap: 8, marginTop: 16 },
    saveBtn: { backgroundColor: '#22C55E', borderRadius: 12, padding: 16, alignItems: 'center' },
    saveBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    cancelBtn: { alignItems: 'center', padding: 12 },
    cancelBtnText: { color: '#94A3B8', fontSize: 14 },
    editBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
    editBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 20 },
    actionRow: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 1,
    },
    actionIcon: { fontSize: 14, marginRight: 12, color: '#334155', fontWeight: '700' },
    actionText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#334155' },
    actionArrow: { fontSize: 22, color: '#CBD5E1' },
    testPushBtn: {
        backgroundColor: '#F0F9FF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#BAE6FD',
    },
    testPushText: { color: '#0369A1', fontWeight: 'bold', fontSize: 16 },
    logoutBtn: {
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    logoutText: { color: '#DC2626', fontWeight: 'bold', fontSize: 16 },
});
