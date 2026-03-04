import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (!email) {
            Alert.alert('Error', 'Ingresa tu correo electrónico.');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        setLoading(false);
        if (error) {
            Alert.alert('Error', error.message);
        } else {
            Alert.alert('Correo enviado', 'Revisa tu bandeja de entrada para restablecer tu contraseña.', [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);
        }
    };

    return (
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
                <View style={s.header}>
                    <Text style={s.emoji}>🔑</Text>
                    <Text style={s.title}>Restablecer Contraseña</Text>
                </View>
                <View style={s.card}>
                    <Text style={s.label}>Correo electrónico</Text>
                    <TextInput style={s.input} placeholder="tu@email.com" placeholderTextColor="#94A3B8" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                    <TouchableOpacity style={[s.btn, loading && s.btnDisabled]} onPress={handleReset} disabled={loading}>
                        <Text style={s.btnText}>{loading ? 'Enviando...' : 'Enviar enlace'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.link}>
                        <Text style={s.linkText}>Volver al inicio de sesión</Text>
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
    emoji: { fontSize: 48, marginBottom: 8 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, elevation: 8 },
    label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, fontSize: 16, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0' },
    btn: { backgroundColor: '#F59E0B', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    link: { alignItems: 'center', marginTop: 16 },
    linkText: { color: '#2563EB', fontSize: 14, fontWeight: '600' },
});
