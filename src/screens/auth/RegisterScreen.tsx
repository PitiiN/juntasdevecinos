import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function RegisterScreen({ navigation }: any) {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!fullName || !email || !password) {
            Alert.alert('Error', 'Completa todos los campos.');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } },
        });
        setLoading(false);
        if (error) {
            Alert.alert('Error al registrar', error.message);
        } else {
            Alert.alert('¡Registro exitoso!', 'Revisa tu correo para confirmar tu cuenta.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);
        }
    };

    return (
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
                <View style={s.header}>
                    <Text style={s.title}>Crear Cuenta</Text>
                    <Text style={s.subtitle}>Únete a tu Junta de Vecinos</Text>
                </View>
                <View style={s.card}>
                    <Text style={s.label}>Nombre completo</Text>
                    <TextInput style={s.input} placeholder="Juan Pérez" placeholderTextColor="#94A3B8" value={fullName} onChangeText={setFullName} />
                    <Text style={s.label}>Correo electrónico</Text>
                    <TextInput style={s.input} placeholder="tu@email.com" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                    <Text style={s.label}>Contraseña</Text>
                    <TextInput style={s.input} placeholder="Mínimo 6 caracteres" placeholderTextColor="#94A3B8" value={password} onChangeText={setPassword} secureTextEntry />
                    <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleRegister} disabled={loading}>
                        <Text style={s.btnText}>{loading ? 'Registrando...' : 'Crear Cuenta'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.link}>
                        <Text style={s.linkText}>¿Ya tienes cuenta? <Text style={s.linkBold}>Inicia sesión</Text></Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const s = StyleSheet.create({
    flex: { flex: 1, backgroundColor: '#1E3A5F' },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 32 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
    subtitle: { fontSize: 16, color: '#94A3B8', marginTop: 4 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, elevation: 8 },
    label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, fontSize: 16, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0' },
    btn: { backgroundColor: '#22C55E', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    link: { alignItems: 'center', marginTop: 16 },
    linkText: { color: '#64748B', fontSize: 14 },
    linkBold: { color: '#2563EB', fontWeight: 'bold' },
});
