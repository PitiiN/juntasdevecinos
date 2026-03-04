import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor ingresa tu email y contraseña.');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (error) {
            Alert.alert('Error al ingresar', error.message);
        }
    };

    return (
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
                <View style={s.header}>
                    <Text style={s.emoji}>🏘️</Text>
                    <Text style={s.title}>JJVV Mobile</Text>
                    <Text style={s.subtitle}>Tu Junta de Vecinos al alcance</Text>
                </View>

                <View style={s.card}>
                    <Text style={s.label}>Correo electrónico</Text>
                    <TextInput
                        style={s.input}
                        placeholder="tu@email.com"
                        placeholderTextColor="#94A3B8"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                    />

                    <Text style={s.label}>Contraseña</Text>
                    <TextInput
                        style={s.input}
                        placeholder="••••••••"
                        placeholderTextColor="#94A3B8"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={[s.btn, loading && s.btnDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        <Text style={s.btnText}>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Register')} style={s.link}>
                        <Text style={s.linkText}>¿No tienes cuenta? <Text style={s.linkBold}>Regístrate aquí</Text></Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('ResetPassword')} style={s.link}>
                        <Text style={s.linkText}>¿Olvidaste tu contraseña?</Text>
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
    emoji: { fontSize: 56, marginBottom: 8 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
    subtitle: { fontSize: 16, color: '#94A3B8', marginTop: 4 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
    label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 12 },
    input: { backgroundColor: '#F1F5F9', borderRadius: 12, padding: 14, fontSize: 16, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0' },
    btn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    link: { alignItems: 'center', marginTop: 16 },
    linkText: { color: '#64748B', fontSize: 14 },
    linkBold: { color: '#2563EB', fontWeight: 'bold' },
});
