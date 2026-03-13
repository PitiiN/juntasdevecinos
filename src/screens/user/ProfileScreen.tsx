import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen({ navigation }: any) {
    const { user } = useAuth();
    const fullName = user?.user_metadata?.full_name || 'Vecino';
    const email = user?.email || '';
    const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString('es-CL') : '';

    // Email modal
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [newEmail, setNewEmail] = useState('');
    const [emailLoading, setEmailLoading] = useState(false);

    // Password modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Address modal
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [address, setAddress] = useState('');
    const [addressLoading, setAddressLoading] = useState(false);

    React.useEffect(() => {
        fetchProfile();
    }, [user]);

    const fetchProfile = async () => {
        if (!user) return;
        try {
            const { data, error } = await supabase.from('profiles').select('address').eq('user_id', user.id).single();
            if (data) setAddress(data.address || '');
            if (error && error.code !== 'PGRST116') console.warn('Error fetching profile:', error);
        } catch (err) {
            console.error('Fetch profile err:', err);
        }
    };

    const handleSaveAddress = async () => {
        if (!user) return;
        setAddressLoading(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ address: address.trim() })
                .eq('user_id', user.id);
            
            if (error) {
                Alert.alert('Error', error.message);
            } else {
                Alert.alert('✅ Dirección actualizada', 'Tu dirección ha sido guardada exitosamente.');
                setShowAddressModal(false);
            }
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Error inesperado');
        } finally {
            setAddressLoading(false);
        }
    };

    const handleChangeEmail = async () => {
        if (!newEmail.trim() || !newEmail.includes('@')) {
            Alert.alert('Error', 'Ingresa un correo electrónico válido.');
            return;
        }
        setEmailLoading(true);
        const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
        setEmailLoading(false);
        if (error) {
            Alert.alert('Error', error.message);
        } else {
            Alert.alert('✅ Correo actualizado', 'Tu correo ha sido actualizado exitosamente.');
            setShowEmailModal(false);
            setNewEmail('');
        }
    };

    const handleChangePassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'Las contraseñas no coinciden.');
            return;
        }
        setPasswordLoading(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        setPasswordLoading(false);
        if (error) {
            Alert.alert('Error', error.message);
        } else {
            Alert.alert('✅ Contraseña actualizada', 'Tu contraseña ha sido cambiada exitosamente.');
            setShowPasswordModal(false);
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                    <Text style={s.backText}>← Volver</Text>
                </TouchableOpacity>

                <View style={s.avatarContainer}>
                    <View style={s.avatar}>
                        <Text style={s.avatarText}>{fullName[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={s.name}>{fullName}</Text>
                </View>

                <View style={s.card}>
                    <Text style={s.label}>Correo electrónico</Text>
                    <Text style={s.value}>{email}</Text>
                </View>

                <View style={s.card}>
                    <Text style={s.label}>Nombre completo</Text>
                    <Text style={s.value}>{fullName}</Text>
                </View>

                <TouchableOpacity style={s.card} onPress={() => setShowAddressModal(true)}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.label}>Dirección</Text>
                            <Text style={s.value}>{address || 'No especificada (Toca para editar)'}</Text>
                        </View>
                        <Text style={{ fontSize: 18 }}>✏️</Text>
                    </View>
                </TouchableOpacity>

                <View style={s.card}>
                    <Text style={s.label}>Miembro desde</Text>
                    <Text style={s.value}>{createdAt}</Text>
                </View>

                <View style={s.card}>
                    <Text style={s.label}>Unidad Vecinal</Text>
                    <Text style={s.value}>UV 22 • San Miguel</Text>
                </View>

                <TouchableOpacity style={s.emailBtn} onPress={() => setShowEmailModal(true)}>
                    <Text style={s.emailText}>✉️ Cambiar Correo Electrónico</Text>
                </TouchableOpacity>

                <TouchableOpacity style={s.resetBtn} onPress={() => setShowPasswordModal(true)}>
                    <Text style={s.resetText}>🔑 Cambiar Contraseña</Text>
                </TouchableOpacity>

                {/* Address Modal */}
                <Modal visible={showAddressModal} transparent animationType="fade">
                    <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowAddressModal(false)}>
                        <View style={s.modalContent} onStartShouldSetResponder={() => true}>
                            <Text style={s.modalTitle}>Editar Dirección</Text>
                            <Text style={s.modalSub}>Ingresa tu dirección particular</Text>
                            <TextInput
                                style={s.input}
                                placeholder="Ej: Calle Siempre Viva 123"
                                placeholderTextColor="#94A3B8"
                                value={address}
                                onChangeText={setAddress}
                            />
                            <TouchableOpacity style={[s.confirmBtn, addressLoading && { opacity: 0.6 }]} onPress={handleSaveAddress} disabled={addressLoading}>
                                <Text style={s.confirmText}>{addressLoading ? 'Guardando...' : 'Guardar dirección'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowAddressModal(false)} style={s.cancelBtn}>
                                <Text style={s.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Email Modal */}
                <Modal visible={showEmailModal} transparent animationType="fade">
                    <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowEmailModal(false)}>
                        <View style={s.modalContent} onStartShouldSetResponder={() => true}>
                            <Text style={s.modalTitle}>Cambiar correo electrónico</Text>
                            <Text style={s.modalSub}>Correo actual: {email}</Text>
                            <TextInput
                                style={s.input}
                                placeholder="Nuevo correo electrónico"
                                placeholderTextColor="#94A3B8"
                                value={newEmail}
                                onChangeText={setNewEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            <TouchableOpacity style={[s.confirmBtn, emailLoading && { opacity: 0.6 }]} onPress={handleChangeEmail} disabled={emailLoading}>
                                <Text style={s.confirmText}>{emailLoading ? 'Guardando...' : 'Confirmar cambio'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowEmailModal(false)} style={s.cancelBtn}>
                                <Text style={s.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Password Modal */}
                <Modal visible={showPasswordModal} transparent animationType="fade">
                    <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowPasswordModal(false)}>
                        <View style={s.modalContent} onStartShouldSetResponder={() => true}>
                            <Text style={s.modalTitle}>Cambiar contraseña</Text>
                            <Text style={s.modalSub}>Ingresa tu nueva contraseña</Text>
                            <TextInput
                                style={s.input}
                                placeholder="Nueva contraseña"
                                placeholderTextColor="#94A3B8"
                                value={newPassword}
                                onChangeText={setNewPassword}
                                secureTextEntry
                            />
                            <TextInput
                                style={s.input}
                                placeholder="Confirmar nueva contraseña"
                                placeholderTextColor="#94A3B8"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                            />
                            <TouchableOpacity style={[s.confirmBtn, passwordLoading && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={passwordLoading}>
                                <Text style={s.confirmText}>{passwordLoading ? 'Guardando...' : 'Cambiar contraseña'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowPasswordModal(false)} style={s.cancelBtn}>
                                <Text style={s.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
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
    back: { marginBottom: 16 },
    backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    avatarContainer: { alignItems: 'center', marginBottom: 24 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1E3A5F', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' },
    name: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 10, elevation: 1 },
    label: { fontSize: 12, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
    value: { fontSize: 16, color: '#0F172A', fontWeight: '500' },
    emailBtn: { backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16, borderWidth: 1, borderColor: '#BFDBFE' },
    emailText: { color: '#1D4ED8', fontWeight: 'bold', fontSize: 16 },
    resetBtn: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#FDE68A' },
    resetText: { color: '#92400E', fontWeight: 'bold', fontSize: 16 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 30 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 4, textAlign: 'center' },
    modalSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 16 },
    input: { backgroundColor: 'transparent', borderRadius: 12, padding: 14, fontSize: 16, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
    confirmBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center' },
    confirmText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
    cancelBtn: { marginTop: 12, alignItems: 'center' },
    cancelText: { color: '#94A3B8', fontSize: 14 },
});
