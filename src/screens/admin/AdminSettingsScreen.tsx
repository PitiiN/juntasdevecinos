import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { pushService } from '../../services/pushService';
import { organizationService, OrganizationRecord } from '../../services/organizationService';

export default function AdminSettingsScreen({ navigation }: any) {
    const { signOut, setViewMode, role, user, organizationId, refreshSession } = useAuth();

    const [organizationSnapshot, setOrganizationSnapshot] = useState<OrganizationRecord | null>(null);
    const [name, setName] = useState('');
    const [region, setRegion] = useState('');
    const [commune, setCommune] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [editing, setEditing] = useState(false);
    const [loadingOrganization, setLoadingOrganization] = useState(false);
    const [saving, setSaving] = useState(false);

    const applyOrganizationForm = (record: OrganizationRecord | null) => {
        setName(record?.name || '');
        setRegion(record?.region || '');
        setCommune(record?.commune || '');
        setAddress(record?.address || '');
        setPhone(record?.phone || '');
        setEmail(record?.email || '');
    };

    const loadOrganization = useCallback(async () => {
        if (!organizationId) {
            setOrganizationSnapshot(null);
            applyOrganizationForm(null);
            return;
        }

        setLoadingOrganization(true);
        try {
            const row = await organizationService.getOrganizationById(organizationId);
            setOrganizationSnapshot(row);
            applyOrganizationForm(row);
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'No se pudo cargar la información de la organización.');
        } finally {
            setLoadingOrganization(false);
        }
    }, [organizationId]);

    useEffect(() => {
        void loadOrganization();
    }, [loadOrganization]);

    const handleSave = async () => {
        if (!organizationId) {
            Alert.alert('No disponible', 'No hay una organización activa para actualizar.');
            return;
        }

        if (!name.trim()) {
            Alert.alert('Dato requerido', 'El nombre de la organización es obligatorio.');
            return;
        }

        setSaving(true);
        try {
            const updated = await organizationService.updateOrganization(organizationId, {
                name,
                region,
                commune,
                address,
                phone,
                email,
            });

            setOrganizationSnapshot(updated);
            applyOrganizationForm(updated);
            setEditing(false);
            await refreshSession();
            Alert.alert('Guardado', 'La información de la organización se actualizó correctamente.');
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'No se pudo guardar la información.');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditing(false);
        applyOrganizationForm(organizationSnapshot);
    };

    const sendTestNotification = async () => {
        try {
            if (!user?.id || !organizationId) {
                Alert.alert('No disponible', 'Necesitas una organización activa para probar notificaciones.');
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
            Alert.alert('Error', `Falló el envío de la notificación de prueba.\n${error?.message || 'Error desconocido'}`);
        }
    };

    const renderField = (
        label: string,
        value: string,
        onChangeText: (value: string) => void,
        placeholder: string,
        keyboardType: 'default' | 'phone-pad' | 'email-address' = 'default',
    ) => (
        <View style={s.card}>
            <Text style={s.label}>{label}</Text>
            <TextInput
                style={s.input}
                value={value}
                onChangeText={onChangeText}
                editable={editing && !saving}
                placeholder={placeholder}
                keyboardType={keyboardType}
                autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
            />
        </View>
    );

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                    <Text style={s.backText}>Volver</Text>
                </TouchableOpacity>

                <Text style={s.title}>Configuración JJVV</Text>
                <Text style={s.subtitle}>Administra los datos de tu organización activa</Text>

                {loadingOrganization ? (
                    <View style={s.loadingCard}>
                        <ActivityIndicator size="large" color="#1E3A5F" />
                        <Text style={s.loadingText}>Cargando información de la organización...</Text>
                    </View>
                ) : (
                    <>
                        {renderField('Nombre de la organización', name, setName, 'Nombre JJVV')}
                        {renderField('Región', region, setRegion, 'Región')}
                        {renderField('Comuna', commune, setCommune, 'Comuna')}
                        {renderField('Dirección', address, setAddress, 'Dirección de la sede')}
                        {renderField('Teléfono de contacto', phone, setPhone, 'Ej: +56 9 1234 5678', 'phone-pad')}
                        {renderField('Correo institucional', email, setEmail, 'organizacion@email.com', 'email-address')}

                        {editing ? (
                            <View style={s.btnRow}>
                                <TouchableOpacity style={[s.saveBtn, saving && s.btnDisabled]} onPress={handleSave} disabled={saving}>
                                    <Text style={s.saveBtnText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} disabled={saving}>
                                    <Text style={s.cancelBtnText}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={s.editBtn} onPress={() => setEditing(true)}>
                                <Text style={s.editBtnText}>Editar información</Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}

                <View style={s.divider} />

                <TouchableOpacity style={s.testPushBtn} onPress={sendTestNotification}>
                    <Text style={s.testPushText}>Enviar notificación push de prueba</Text>
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
                        Alert.alert('Cerrar sesión', '¿Estás seguro?', [
                            { text: 'Cancelar' },
                            { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
                        ])
                    }
                >
                    <Text style={s.logoutText}>Cerrar sesión</Text>
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
    loadingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        elevation: 1,
        marginBottom: 10,
    },
    loadingText: { marginTop: 12, color: '#475569', fontSize: 14 },
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
    btnDisabled: { opacity: 0.7 },
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

