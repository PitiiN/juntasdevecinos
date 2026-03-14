import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { GLOBAL_SUPERADMIN_EMAIL, getRoleLabel } from '../../lib/constants';

const confirmationWord = 'ELIMINAR';

export default function DeleteAccountScreen({ navigation }: any) {
    const { deleteAccount, user, role } = useAuth();
    const [confirmationText, setConfirmationText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isReservedGlobalSuperadmin = (user?.email || '').toLowerCase() === GLOBAL_SUPERADMIN_EMAIL;
    const hasInstitutionalRole = !!role && role !== 'member';
    const canDelete = confirmationText.trim().toUpperCase() === confirmationWord && !isSubmitting && !isReservedGlobalSuperadmin;

    const retainedItems = useMemo(
        () => [
            'Historial de cuotas ya emitidas, pero sin los comprobantes privados que subiste.',
            'Documentos, avisos, finanzas o contenido institucional ya publicado por la JJVV.',
            'Registros de auditoria necesarios para seguridad y trazabilidad interna.',
        ],
        [],
    );

    const deletedItems = useMemo(
        () => [
            'Tu acceso a la app y la sesion actual.',
            'Tu perfil personal, membresias y tokens de notificaciones.',
            'Tus votos, inscripciones, favores, respuestas, alertas y solicitudes creadas por ti.',
            'Archivos privados personales asociados a cuotas, respuestas y solicitudes.',
        ],
        [],
    );

    const handleDelete = async () => {
        Alert.alert(
            'Eliminar cuenta',
            'Esta accion no se puede deshacer. Se eliminara tu acceso y tus datos personales eliminables dentro de la app JJVV.',
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar cuenta',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsSubmitting(true);
                            await deleteAccount();
                            Alert.alert(
                                'Cuenta eliminada',
                                'Tu cuenta fue eliminada de la app. Si necesitas volver, tendras que registrarte de nuevo y ser incorporado otra vez a una JJVV.',
                            );
                        } catch (error: any) {
                            Alert.alert('No se pudo eliminar la cuenta', error?.message || 'Intentalo nuevamente.');
                        } finally {
                            setIsSubmitting(false);
                        }
                    },
                },
            ],
        );
    };

    return (
        <SafeAreaView style={s.safe}>
            <KeyboardAvoidingView
                style={s.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={s.scroll}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                        <Text style={s.backText}>Volver</Text>
                    </TouchableOpacity>

                    <View style={s.header}>
                        <Text style={s.title}>Eliminar mi cuenta</Text>
                        <Text style={s.subtitle}>
                            Esta opcion elimina tu acceso a la app JJVV y limpia los datos personales eliminables asociados a tu cuenta.
                        </Text>
                        <Text style={s.meta}>Correo: {user?.email || 'Sin correo'}</Text>
                        <Text style={s.meta}>Rol actual: {getRoleLabel(role)}</Text>
                    </View>

                    {hasInstitutionalRole && (
                        <View style={[s.card, s.warningCard]}>
                            <Text style={s.cardTitle}>Atencion para cuentas administrativas</Text>
                            <Text style={s.cardBody}>
                                Si publicaste contenido institucional, ese historial puede mantenerse para no romper la trazabilidad de la JJVV.
                            </Text>
                        </View>
                    )}

                    <View style={s.card}>
                        <Text style={s.cardTitle}>Se elimina ahora</Text>
                        {deletedItems.map((item) => (
                            <Text key={item} style={s.listItem}>- {item}</Text>
                        ))}
                    </View>

                    <View style={s.card}>
                        <Text style={s.cardTitle}>Se conserva por obligacion operativa</Text>
                        {retainedItems.map((item) => (
                            <Text key={item} style={s.listItem}>- {item}</Text>
                        ))}
                    </View>

                    {isReservedGlobalSuperadmin ? (
                        <View style={[s.card, s.blockedCard]}>
                            <Text style={s.cardTitle}>Cuenta protegida</Text>
                            <Text style={s.cardBody}>
                                La cuenta superadmin global reservada debe gestionarse manualmente para no dejar sin administracion global a la plataforma.
                            </Text>
                        </View>
                    ) : (
                        <View style={s.card}>
                            <Text style={s.cardTitle}>Confirmacion</Text>
                            <Text style={s.cardBody}>
                                Escribe <Text style={s.code}>{confirmationWord}</Text> para habilitar la eliminacion.
                            </Text>
                            <TextInput
                                autoCapitalize="characters"
                                autoCorrect={false}
                                editable={!isSubmitting}
                                placeholder={confirmationWord}
                                placeholderTextColor="#94A3B8"
                                style={s.input}
                                value={confirmationText}
                                onChangeText={setConfirmationText}
                            />
                        </View>
                    )}

                    <TouchableOpacity
                        disabled={!canDelete}
                        style={[s.deleteButton, !canDelete && s.deleteButtonDisabled]}
                        onPress={handleDelete}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={s.deleteButtonText}>Eliminar mi cuenta</Text>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },
    flex: { flex: 1 },
    scroll: { padding: 20, gap: 16 },
    back: { marginBottom: 4 },
    backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    header: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    title: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
    subtitle: { fontSize: 14, color: '#475569', marginTop: 8, lineHeight: 20 },
    meta: { fontSize: 13, color: '#64748B', marginTop: 8 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    warningCard: {
        borderColor: '#FBBF24',
        backgroundColor: '#FFFBEB',
    },
    blockedCard: {
        borderColor: '#FCA5A5',
        backgroundColor: '#FEF2F2',
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
    cardBody: { fontSize: 14, color: '#475569', marginTop: 8, lineHeight: 20 },
    listItem: { fontSize: 14, color: '#334155', marginTop: 10, lineHeight: 20 },
    code: {
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
        fontWeight: '700',
        color: '#0F172A',
    },
    input: {
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 16,
        color: '#0F172A',
        backgroundColor: '#FFFFFF',
    },
    deleteButton: {
        backgroundColor: '#DC2626',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
    deleteButtonDisabled: {
        backgroundColor: '#FCA5A5',
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
