import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { accessRequestService, JoinableOrganization } from '../../services/accessRequestService';

export default function RegisterScreen({ navigation }: any) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [organizations, setOrganizations] = useState<JoinableOrganization[]>([]);
    const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
    const [loadingOrganizations, setLoadingOrganizations] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showOrganizationModal, setShowOrganizationModal] = useState(false);

    useEffect(() => {
        void loadOrganizations();
    }, []);

    const selectedOrganization = useMemo(
        () => organizations.find((item) => item.id === selectedOrganizationId) || null,
        [organizations, selectedOrganizationId],
    );

    const loadOrganizations = async () => {
        setLoadingOrganizations(true);
        try {
            const data = await accessRequestService.listJoinableOrganizations();
            setOrganizations(data);
        } catch (error: any) {
            Alert.alert('No se pudo cargar la lista de JJVV', error?.message || 'Inténtalo nuevamente.');
        } finally {
            setLoadingOrganizations(false);
        }
    };

    const handleRegister = async () => {
        if (!fullName || !email || !password || !selectedOrganizationId) {
            Alert.alert('Error', 'Completa todos los campos y elige la organización a la que deseas unirte.');
            return;
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    requested_organization_id: selectedOrganizationId,
                },
            },
        });
        setLoading(false);

        if (error) {
            Alert.alert('Error al registrar', error.message);
            return;
        }

        const organizationName = selectedOrganization?.name || 'la organización seleccionada';
        const hasSession = Boolean(data.session);
        Alert.alert(
            'Solicitud enviada',
            hasSession
                ? `Tu cuenta fue creada y tu solicitud para unirte a ${organizationName} quedó pendiente de aprobación. Hasta que la aprueben no tendrás acceso a la app.`
                : `Tu cuenta fue creada y tu solicitud para unirte a ${organizationName} quedó pendiente de aprobación. Si tu proyecto usa confirmacion por correo, revisa tu bandeja antes de iniciar sesión.`,
            [
                {
                    text: 'OK',
                    onPress: () => {
                        if (!hasSession) {
                            navigation.navigate('Login');
                        }
                    },
                },
            ],
        );
    };

    return (
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
                <View style={s.header}>
                    <Text style={s.title}>Crear Cuenta</Text>
                    <Text style={s.subtitle}>Solicita ingreso a tu Junta de Vecinos</Text>
                </View>

                <View style={s.card}>
                    <Text style={s.label}>Nombre completo</Text>
                    <TextInput
                        style={s.input}
                        placeholder="Juan Perez"
                        placeholderTextColor="#94A3B8"
                        value={fullName}
                        onChangeText={setFullName}
                    />

                    <Text style={s.label}>Correo electronico</Text>
                    <TextInput
                        style={s.input}
                        placeholder="tu@email.com"
                        placeholderTextColor="#94A3B8"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <Text style={s.label}>Contrasena</Text>
                    <TextInput
                        style={s.input}
                        placeholder="Minimo 6 caracteres"
                        placeholderTextColor="#94A3B8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <Text style={s.label}>Junta de Vecinos</Text>
                    <TouchableOpacity style={s.selector} onPress={() => setShowOrganizationModal(true)}>
                        <View style={{ flex: 1 }}>
                            <Text style={selectedOrganization ? s.selectorValue : s.selectorPlaceholder}>
                                {selectedOrganization?.name || (loadingOrganizations ? 'Cargando organizaciónes...' : 'Seleccionar organización')}
                            </Text>
                            {selectedOrganization && (
                                <Text style={s.selectorMeta}>
                                    {[selectedOrganization.commune, selectedOrganization.region].filter(Boolean).join(' - ')}
                                </Text>
                            )}
                        </View>
                        <Text style={s.selectorArrow}></Text>
                    </TouchableOpacity>

                    <Text style={s.helperText}>
                        Tu cuenta quedara bloqueada hasta que un administrador de la JJVV apruebe tu solicitud.
                    </Text>

                    <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleRegister} disabled={loading}>
                        <Text style={s.btnText}>{loading ? 'Registrando...' : 'Crear cuenta y solicitar acceso'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.link}>
                        <Text style={s.linkText}>¿Ya tienes cuenta? <Text style={s.linkBold}>Inicia sesión</Text></Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal visible={showOrganizationModal} transparent animationType="fade">
                <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowOrganizationModal(false)}>
                    <View style={s.modalCard} onStartShouldSetResponder={() => true}>
                        <Text style={s.modalTitle}>Selecciona tu JJVV</Text>
                        <Text style={s.modalSubtitle}>
                            La solicitud llegara al inbox de administradores de esa organización.
                        </Text>

                        {loadingOrganizations ? (
                            <ActivityIndicator color="#2563EB" style={{ marginVertical: 24 }} />
                        ) : (
                            <ScrollView style={s.orgList}>
                                {organizations.map((organization) => {
                                    const isSelected = organization.id === selectedOrganizationId;
                                    return (
                                        <TouchableOpacity
                                            key={organization.id}
                                            style={[s.orgOption, isSelected && s.orgOptionSelected]}
                                            onPress={() => {
                                                setSelectedOrganizationId(organization.id);
                                                setShowOrganizationModal(false);
                                            }}
                                        >
                                            <View style={s.orgInfo}>
                                                <Text style={[s.orgName, isSelected && s.orgNameSelected]}>
                                                    {organization.name}
                                                </Text>
                                                <Text style={[s.orgLocation, isSelected && s.orgLocationSelected]}>
                                                    {[organization.commune, organization.region].filter(Boolean).join(' - ') || 'Sin ubicacion registrada'}
                                                </Text>
                                            </View>
                                            <Text style={[s.orgBadge, isSelected && s.orgBadgeSelected]}>
                                                {isSelected ? 'Elegida' : 'Elegir'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}

                        <TouchableOpacity onPress={() => setShowOrganizationModal(false)} style={s.cancelBtn}>
                            <Text style={s.cancelText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#1E3A5F' },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 32 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
    subtitle: { fontSize: 16, color: '#94A3B8', marginTop: 4, textAlign: 'center' },
    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, elevation: 8 },
    label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 12 },
    input: {
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: '#0F172A',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    selector: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectorPlaceholder: { fontSize: 16, color: '#94A3B8' },
    selectorValue: { fontSize: 16, color: '#0F172A', fontWeight: '600' },
    selectorMeta: { fontSize: 12, color: '#64748B', marginTop: 4 },
    selectorArrow: { fontSize: 22, color: '#94A3B8', marginLeft: 10 },
    helperText: { fontSize: 12, color: '#64748B', lineHeight: 18, marginTop: 10 },
    btn: { backgroundColor: '#22C55E', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    link: { alignItems: 'center', marginTop: 16 },
    linkText: { color: '#64748B', fontSize: 14 },
    linkBold: { color: '#2563EB', fontWeight: 'bold' },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'center',
        padding: 24,
    },
    modalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
    modalSubtitle: { fontSize: 13, color: '#64748B', marginTop: 6, marginBottom: 14, lineHeight: 18 },
    orgList: { marginBottom: 12 },
    orgOption: {
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    orgOptionSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
    orgInfo: { flex: 1, marginRight: 8 },
    orgName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
    orgNameSelected: { color: '#1D4ED8' },
    orgLocation: { fontSize: 12, color: '#64748B', marginTop: 4 },
    orgLocationSelected: { color: '#2563EB' },
    orgBadge: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        backgroundColor: '#F1F5F9',
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        overflow: 'hidden',
    },
    orgBadgeSelected: { color: '#FFFFFF', backgroundColor: '#2563EB' },
    cancelBtn: { alignItems: 'center', paddingTop: 6 },
    cancelText: { color: '#64748B', fontSize: 14, fontWeight: '600' },
});




