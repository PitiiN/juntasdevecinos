import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';
import { useAppStore, formatCLP } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { duesService } from '../../services/duesService';
import { financeService, FinanceViewItem } from '../../services/financeService';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Generate year range 2000-2040
const YEARS: number[] = [];
for (let y = 2000; y <= 2040; y++) YEARS.push(y);

export default function AdminFinanceScreen({ navigation }: any) {
    const { organizationId, user } = useAuth();
    const { memberDues, members } = useAppStore();
    const setMembers = useAppStore(s => s.setMembers);
    const setMemberDues = useAppStore(s => s.setMemberDues);
    const [finances, setFinances] = useState<FinanceViewItem[]>([]);
    const [tab, setTab] = useState<'movimientos' | 'cuotas'>('movimientos');
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [type, setType] = useState<'income' | 'expense'>('income');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const now = new Date();
    const [filterMonth, setFilterMonth] = useState(now.getMonth());
    const [filterYear, setFilterYear] = useState(now.getFullYear());
    const [showYearPicker, setShowYearPicker] = useState(false);
    const yearScrollRef = useRef<ScrollView>(null);

    // Rejection Modal State
    const [rejectingDue, setRejectingDue] = useState<any>(null);
    const [rejectReason, setRejectReason] = useState('DOCUMENTO_ILEGIBLE');
    const [rejectComment, setRejectComment] = useState('');

    const loadFinanceContext = useCallback(async () => {
        if (!organizationId) {
            setFinances([]);
            setMembers([]);
            setMemberDues([]);
            return;
        }

        try {
            const [remoteDues, remoteFinances] = await Promise.all([
                duesService.getOrganizationDues(organizationId, {}),
                financeService.getFinances(organizationId),
            ]);
            const mappedMembers = Array.from(
                new Map(
                    remoteDues.map((due) => ([
                        due.memberId,
                        {
                            id: due.memberId,
                            name: due.memberName || 'Vecino',
                            email: '',
                            role: 'member',
                            active: true,
                        },
                    ]))
                ).values()
            );

            setFinances(remoteFinances);
            setMembers(mappedMembers);
            setMemberDues(remoteDues.map((due) => ({
                id: due.id,
                memberId: due.memberId,
                memberName: due.memberName,
                month: due.month,
                year: due.year,
                amount: due.amount,
                status: due.status,
                paidDate: due.paidDate,
                receiptUri: due.proofUrl || due.proofPath || undefined,
                rejectionReason: due.rejectionReason || undefined,
                adminComment: due.rejectionComment || undefined,
                voucherId: due.voucherId,
            })));
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo cargar la informacion financiera.');
        }
    }, [organizationId, setMemberDues, setMembers]);

    useEffect(() => {
        void loadFinanceContext();
    }, [loadFinanceContext]);

    const refreshDuesAfter = async (action: () => Promise<void>) => {
        try {
            await action();
            await loadFinanceContext();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo actualizar la cuota.');
        }
    };

    const totalIncome = finances.filter(f => f.type === 'income').reduce((a, b) => a + b.amount, 0);
    const totalExpense = finances.filter(f => f.type === 'expense').reduce((a, b) => a + b.amount, 0);

    const searchResults = searchQuery.length >= 3
        ? members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    const startEdit = (f: any) => {
        setEditId(f.id); setType(f.type); setCategory(f.category); setDescription(f.description); setAmount(f.amount.toString()); setShowForm(true);
    };

    const handleSave = async () => {
        if (!organizationId || !user?.id) {
            Alert.alert('Error', 'No se pudo identificar la organizacion activa.');
            return;
        }

        if (!category || !description || !amount) {
            Alert.alert('Error', 'Completa todos los campos.');
            return;
        }

        try {
            if (editId) {
                await financeService.updateEntry(editId, {
                    type,
                    category,
                    description,
                    amount: parseInt(amount, 10),
                });
                Alert.alert('Registro actualizado');
            } else {
                await financeService.createEntry({
                    organizationId,
                    type,
                    category,
                    description,
                    amount: parseInt(amount, 10),
                    createdBy: user.id,
                });
                Alert.alert('Registro guardado');
            }

            setShowForm(false);
            setEditId(null);
            setCategory('');
            setDescription('');
            setAmount('');
            await loadFinanceContext();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo guardar el registro.');
        }
    };

    const handleDelete = (id: string) => {
        Alert.alert('Eliminar?', 'Este registro sera eliminado.', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Eliminar',
                style: 'destructive',
                onPress: () => {
                    void (async () => {
                        try {
                            await financeService.deleteEntry(id);
                            await loadFinanceContext();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'No se pudo eliminar el registro.');
                        }
                    })();
                },
            },
        ]);
    };

    const handleDuePress = (due: any) => {
        if (due.status === 'PENDING_VALIDATION') {
            Alert.alert(`Validar Cuota ${MONTHS[due.month - 1]}`, `Socio: ${due.memberName}\n\nSelecciona la acción a tomar tras revisar el comprobante:`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: '❌ Rechazar Pago', style: 'destructive', onPress: () => setRejectingDue(due) },
                { text: '✅ Aprobar', onPress: () => { void refreshDuesAfter(() => duesService.approveDue(due.id)); } },
            ]);
        } else if (due.status !== 'paid') {
            Alert.alert('Marcar como pagada', `¿Registrar pago manual de ${MONTHS[due.month - 1]} ${due.year} para ${due.memberName}?`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Confirmar', onPress: () => { void refreshDuesAfter(() => duesService.setDueStatus(due.id, 'paid')); } },
            ]);
        } else {
            Alert.alert('Revertir pago', `¿Desmarcar como pagada la cuota de ${MONTHS[due.month - 1]} ${due.year} para ${due.memberName}?`, [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Revertir', style: 'destructive', onPress: () => { void refreshDuesAfter(() => duesService.setDueStatus(due.id, 'due')); } },
            ]);
        }
    };

    const confirmRejection = async () => {
        if (!rejectingDue) return;
        try {
            await duesService.rejectDue(rejectingDue.id, rejectReason, rejectComment);
            await loadFinanceContext();
            setRejectingDue(null);
            setRejectReason('DOCUMENTO_ILEGIBLE');
            setRejectComment('');
            Alert.alert('Pago rechazado', 'Se ha actualizado el estado del comprobante.');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No se pudo rechazar el comprobante.');
        }
    };

    const exportExcel = async (reportType: 'finance' | 'dues') => {
        try {
            const wb = XLSX.utils.book_new();

            if (reportType === 'finance') {
                const incomeData = finances.filter(f => f.type === 'income').map(f => ({
                    'Fecha': f.date, 'Categoría': f.category, 'Descripción': f.description, 'Monto': f.amount,
                }));
                const expenseData = finances.filter(f => f.type === 'expense').map(f => ({
                    'Fecha': f.date, 'Categoría': f.category, 'Descripción': f.description, 'Monto': f.amount,
                }));
                if (incomeData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incomeData), 'Ingresos');
                if (expenseData.length > 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseData), 'Egresos');
                if (incomeData.length === 0 && expenseData.length === 0) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sin datos']]), 'Info');
            } else {
                const duesData = memberDues.map(d => ({
                    'Socio': d.memberName, 'Mes': MONTHS[d.month - 1], 'Año': d.year,
                    'Monto': d.amount, 'Estado': d.status === 'paid' ? 'Pagada' : d.status === 'overdue' ? 'Atrasada' : 'Pendiente',
                    'Fecha Pago': d.paidDate || '-',
                }));
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(duesData.length > 0 ? duesData : [{ 'Info': 'Sin datos' }]), 'Cuotas Socios');
            }

            // Generate xlsx as base64 string
            const wbBase64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

            // Use new expo-file-system v19 API: File class
            const fileName = reportType === 'finance' ? 'Informe_Financiero_JJVV.xlsx' : 'Cuotas_Socios_JJVV.xlsx';
            const file = new File(Paths.cache, fileName);
            // Write base64 to file
            file.write(wbBase64, { encoding: 'base64' });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(file.uri, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: 'Guardar ' + fileName,
                });
            } else {
                Alert.alert('Archivo guardado', `Se guardó en: ${file.uri}`);
            }
        } catch (e: any) {
            Alert.alert('Error al exportar', e?.message || 'Error desconocido');
            console.error('Excel export error:', e);
        }
    };

    const cancelForm = () => { setShowForm(false); setEditId(null); setCategory(''); setDescription(''); setAmount(''); };

    const selectMember = (m: any) => {
        setSelectedMemberId(m.id);
        setSearchQuery(m.name);
    };

    const selectedMember = selectedMemberId ? members.find(m => m.id === selectedMemberId) : null;

    const filteredFinances = finances.filter(f => {
        const parts = f.date.split(' ');
        if (parts.length >= 3) {
            const monthStr = parts[1]?.toLowerCase();
            const yearStr = parseInt(parts[2]);
            const mIdx = MONTHS.findIndex(m => m.toLowerCase() === monthStr?.substring(0, 3));
            return mIdx === filterMonth && yearStr === filterYear;
        }
        return true;
    });

    // Scroll to current year when opening picker
    const openYearPicker = () => {
        setShowYearPicker(true);
    };

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView contentContainerStyle={s.scroll}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Text style={s.backText}>← Volver</Text></TouchableOpacity>
                <Text style={s.title}>💰 Gestión Financiera</Text>

                <View style={s.summary}>
                    <View style={[s.sumCard, { backgroundColor: '#F0FDF4' }]}><Text style={s.sumLabel}>Ingresos</Text><Text style={[s.sumValue, { color: '#22C55E' }]}>{formatCLP(totalIncome)}</Text></View>
                    <View style={[s.sumCard, { backgroundColor: '#FEF2F2' }]}><Text style={s.sumLabel}>Egresos</Text><Text style={[s.sumValue, { color: '#EF4444' }]}>{formatCLP(totalExpense)}</Text></View>
                </View>
                <View style={s.balanceCard}>
                    <Text style={s.balLabel}>Balance Total</Text>
                    <Text style={[s.balValue, { color: totalIncome - totalExpense >= 0 ? '#22C55E' : '#EF4444' }]}>{formatCLP(totalIncome - totalExpense)}</Text>
                </View>

                <View style={s.exportRow}>
                    <TouchableOpacity style={[s.exportBtn, { backgroundColor: '#7C3AED' }]} onPress={() => exportExcel('finance')}><Text style={s.exportText}>📊 Excel Finanzas</Text></TouchableOpacity>
                    <TouchableOpacity style={[s.exportBtn, { backgroundColor: '#2563EB' }]} onPress={() => exportExcel('dues')}><Text style={s.exportText}>👥 Excel Cuotas</Text></TouchableOpacity>
                </View>

                <View style={s.tabs}>
                    <TouchableOpacity style={[s.tab, tab === 'movimientos' && s.tabActive]} onPress={() => setTab('movimientos')}><Text style={[s.tabText, tab === 'movimientos' && s.tabTextActive]}>Movimientos</Text></TouchableOpacity>
                    <TouchableOpacity style={[s.tab, tab === 'cuotas' && s.tabActive]} onPress={() => { setTab('cuotas'); setSearchQuery(''); setSelectedMemberId(null); }}><Text style={[s.tabText, tab === 'cuotas' && s.tabTextActive]}>Cuotas Socios</Text></TouchableOpacity>
                </View>

                {tab === 'movimientos' && (<>
                    <TouchableOpacity style={s.yearDropdown} onPress={openYearPicker}>
                        <Text style={s.yearDropdownText}>📅 {filterYear}</Text>
                        <Text style={s.yearDropdownArrow}>▾</Text>
                    </TouchableOpacity>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.monthScroll}>
                        {MONTHS.map((m, i) => (
                            <TouchableOpacity key={i} style={[s.pill, filterMonth === i && s.pillActive]} onPress={() => setFilterMonth(i)}>
                                <Text style={[s.pillText, filterMonth === i && s.pillTextActive]}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={s.newBtn} onPress={() => showForm ? cancelForm() : setShowForm(true)}>
                        <Text style={s.newBtnText}>{showForm ? '✕ Cancelar' : '+ Nuevo Registro'}</Text>
                    </TouchableOpacity>
                    {showForm && (
                        <View style={s.form}>
                            <Text style={s.formTitle}>{editId ? '✏️ Editar' : '📝 Nuevo Registro'}</Text>
                            <View style={s.typeRow}>
                                <TouchableOpacity style={[s.typeBtn, type === 'income' && s.typeIncome]} onPress={() => setType('income')}><Text style={[s.typeText, type === 'income' && { color: '#FFF' }]}>📥 Ingreso</Text></TouchableOpacity>
                                <TouchableOpacity style={[s.typeBtn, type === 'expense' && s.typeExpense]} onPress={() => setType('expense')}><Text style={[s.typeText, type === 'expense' && { color: '#FFF' }]}>📤 Egreso</Text></TouchableOpacity>
                            </View>
                            <TextInput style={s.input} placeholder="Categoría" placeholderTextColor="#94A3B8" value={category} onChangeText={setCategory} />
                            <TextInput style={s.input} placeholder="Descripción" placeholderTextColor="#94A3B8" value={description} onChangeText={setDescription} />
                            <TextInput style={s.input} placeholder="Monto ($)" placeholderTextColor="#94A3B8" value={amount} onChangeText={setAmount} keyboardType="numeric" />
                            <TouchableOpacity style={s.submitBtn} onPress={handleSave}><Text style={s.submitText}>{editId ? '💾 Guardar' : '✅ Registrar'}</Text></TouchableOpacity>
                        </View>
                    )}
                    {filteredFinances.length === 0 ? (
                        <View style={s.emptySearch}><Text style={s.emptyIcon}>📭</Text><Text style={s.emptyText}>No hay movimientos en {MONTHS[filterMonth]} {filterYear}</Text></View>
                    ) : filteredFinances.map(f => (
                        <TouchableOpacity key={f.id} style={s.entry} onPress={() => startEdit(f)} onLongPress={() => handleDelete(f.id)}>
                            <Text style={s.entryIcon}>{f.type === 'income' ? '📥' : '📤'}</Text>
                            <View style={s.entryInfo}><Text style={s.entryDesc}>{f.description}</Text><Text style={s.entryMeta}>{f.category} • {f.date}</Text></View>
                            <Text style={[s.entryAmount, { color: f.type === 'income' ? '#22C55E' : '#EF4444' }]}>{f.type === 'income' ? '+' : '-'}{formatCLP(f.amount)}</Text>
                        </TouchableOpacity>
                    ))}
                    <Text style={s.hint}>💡 Toca para editar, mantén presionado para eliminar</Text>
                </>)}

                {tab === 'cuotas' && (<>
                    {(() => {
                        const pendingValidations = memberDues.filter(d => d.status === 'PENDING_VALIDATION');
                        if (pendingValidations.length === 0 || selectedMemberId) return null;
                        return (
                            <View style={s.pendingContainer}>
                                <Text style={s.pendingHeader}>⚠️ Comprobantes por revisar ({pendingValidations.length})</Text>
                                {pendingValidations.map(due => (
                                    <TouchableOpacity key={due.id} style={s.pendingCard} onPress={() => {
                                        setSearchQuery(due.memberName);
                                        const m = members.find(mbr => mbr.name === due.memberName);
                                        if (m) setSelectedMemberId(m.id);
                                    }}>
                                        <Text style={s.pendingAvatarText}>{due.memberName[0]}</Text>
                                        <View style={{ flex: 1, marginLeft: 10 }}>
                                            <Text style={s.pendingName}>{due.memberName}</Text>
                                            <Text style={s.pendingDesc}>Revisar cuota de {MONTHS[due.month - 1]} {due.year}</Text>
                                        </View>
                                        <Text style={s.pendingName}>→</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        );
                    })()}
                    <TextInput style={s.searchInput} placeholder="🔍 Buscar socio (mín. 3 letras)..." placeholderTextColor="#94A3B8" value={searchQuery}
                        onChangeText={(t) => { setSearchQuery(t); if (t.length < 3) setSelectedMemberId(null); }} />
                    {searchQuery.length >= 3 && !selectedMemberId && (
                        <View style={s.dropdown}>
                            {searchResults.length === 0 ? (<Text style={s.dropdownEmpty}>No se encontraron socios</Text>
                            ) : searchResults.map(m => (
                                <TouchableOpacity key={m.id} style={s.dropdownItem} onPress={() => selectMember(m)}>
                                    <View style={s.dropdownAvatar}><Text style={s.dropdownAvatarText}>{m.name[0]}</Text></View>
                                    <View><Text style={s.dropdownName}>{m.name}</Text><Text style={s.dropdownEmail}>{m.email}</Text></View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                    {selectedMember && (() => {
                        const dues = memberDues.filter(d => d.memberId === selectedMember.id).sort((a, b) => a.year === b.year ? a.month - b.month : a.year - b.year);
                        const paid = dues.filter(d => d.status === 'paid').length;
                        const pending = dues.filter(d => d.status !== 'paid').length;
                        return (
                            <View>
                                <View style={s.memberHeader}>
                                    <View style={s.memberAvatar}><Text style={s.memberAvatarText}>{selectedMember.name[0]}</Text></View>
                                    <View><Text style={s.memberName}>{selectedMember.name}</Text><Text style={s.memberStats}>✅ {paid} pagadas • ⏳ {pending} pendientes</Text></View>
                                </View>
                                {dues.map(d => {
                                    let borderColor = '#F59E0B';
                                    let bgColor = '#FFFBEB';
                                    let textColor = '#F59E0B';
                                    let label = '⏳ Pendiente';

                                    if (d.status === 'paid') { borderColor = '#22C55E'; bgColor = '#F0FDF4'; textColor = '#22C55E'; label = '✅ Pagada'; }
                                    else if (d.status === 'overdue') { borderColor = '#EF4444'; bgColor = '#FEF2F2'; textColor = '#EF4444'; label = '⚠️ Atrasada'; }
                                    else if (d.status === 'PENDING_VALIDATION') { borderColor = '#3B82F6'; bgColor = '#EFF6FF'; textColor = '#3B82F6'; label = '🔍 Revisar'; }
                                    else if (d.status === 'REJECTED') { borderColor = '#B91C1C'; bgColor = '#FEF2F2'; textColor = '#B91C1C'; label = '❌ Rechazada'; }

                                    return (
                                        <TouchableOpacity key={d.id} style={[s.dueRow, { borderLeftColor: borderColor }]}
                                            onPress={() => handleDuePress(d)}>
                                            <Text style={s.dueMonth}>{MONTHS[d.month - 1]} {d.year}</Text>
                                            <Text style={s.dueAmount}>{formatCLP(d.amount)}</Text>
                                            <View style={[s.dueBadge, { backgroundColor: bgColor }]}>
                                                <Text style={{ color: textColor, fontSize: 11, fontWeight: '600' }}>{label}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        );
                    })()}
                    {!selectedMemberId && searchQuery.length < 3 && (
                        <View style={s.emptySearch}><Text style={s.emptyIcon}>🔍</Text><Text style={s.emptyText}>Busca un socio para ver sus cuotas</Text><Text style={s.emptyHint}>Escribe al menos 3 letras del nombre</Text></View>
                    )}
                    <Text style={s.hint}>💡 Toca para marcar como pagada o revertir el pago</Text>
                </>)}

                {/* Year picker modal */}
                <Modal visible={showYearPicker} transparent animationType="fade">
                    <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowYearPicker(false)}>
                        <View style={s.modalContent}>
                            <Text style={s.modalTitle}>Seleccionar Año</Text>
                            <ScrollView style={{ maxHeight: 350 }} ref={yearScrollRef}
                                onLayout={() => {
                                    const idx = YEARS.indexOf(filterYear);
                                    if (idx >= 0 && yearScrollRef.current) {
                                        yearScrollRef.current.scrollTo({ y: Math.max(0, idx * 50 - 100), animated: false });
                                    }
                                }}>
                                {YEARS.map(y => (
                                    <TouchableOpacity key={y} style={[s.yearOption, filterYear === y && s.yearOptionActive]} onPress={() => { setFilterYear(y); setShowYearPicker(false); }}>
                                        <Text style={[s.yearOptionText, filterYear === y && s.yearOptionTextActive]}>{y}</Text>
                                        {filterYear === y && <Text style={s.yearCheck}>✓</Text>}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Rejection Modal */}
                <Modal visible={!!rejectingDue} transparent animationType="slide">
                    <View style={s.modalOverlay}>
                        <View style={s.modalContentWide}>
                            <Text style={s.modalTitle}>Rechazar Comprobante</Text>
                            <Text style={s.modalSub}>Cuota: {MONTHS[rejectingDue?.month - 1]} {rejectingDue?.year} de {rejectingDue?.memberName}</Text>

                            <Text style={s.label}>Motivo Principal:</Text>
                            <View style={s.reasonRow}>
                                <TouchableOpacity style={[s.reasonBtn, rejectReason === 'DOCUMENTO_ILEGIBLE' && s.reasonBtnActive]} onPress={() => setRejectReason('DOCUMENTO_ILEGIBLE')}>
                                    <Text style={[s.reasonText, rejectReason === 'DOCUMENTO_ILEGIBLE' && s.reasonTextActive]}>Ilegible</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.reasonBtn, rejectReason === 'MONTO_INCORRECTO' && s.reasonBtnActive]} onPress={() => setRejectReason('MONTO_INCORRECTO')}>
                                    <Text style={[s.reasonText, rejectReason === 'MONTO_INCORRECTO' && s.reasonTextActive]}>Monto Err.</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[s.reasonBtn, rejectReason === 'OTRO' && s.reasonBtnActive]} onPress={() => setRejectReason('OTRO')}>
                                    <Text style={[s.reasonText, rejectReason === 'OTRO' && s.reasonTextActive]}>Otro</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={s.label}>Comentarios adicionales (opcional):</Text>
                            <TextInput style={[s.input, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Ej: Faltan $1.000, o por favor enfocalo mejor..." placeholderTextColor="#94A3B8" value={rejectComment} onChangeText={setRejectComment} multiline />

                            <View style={s.modalBtnRow}>
                                <TouchableOpacity style={s.cancelBtn} onPress={() => setRejectingDue(null)}><Text style={s.cancelText}>Cancelar</Text></TouchableOpacity>
                                <TouchableOpacity style={s.rejectConfirmBtn} onPress={confirmRejection}><Text style={s.rejectConfirmText}>Rechazar</Text></TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: 'transparent' }, scroll: { padding: 20 },
    back: { marginBottom: 16 }, backText: { color: '#2563EB', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 16 },
    summary: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    sumCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', elevation: 1 },
    sumLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 }, sumValue: { fontSize: 16, fontWeight: 'bold' },
    balanceCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 12, elevation: 2 },
    balLabel: { fontSize: 14, color: '#64748B', marginBottom: 4 }, balValue: { fontSize: 28, fontWeight: 'bold' },
    exportRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    exportBtn: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
    exportText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
    tabs: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 10, marginBottom: 16, padding: 3 },
    tab: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center' },
    tabActive: { backgroundColor: '#FFFFFF', elevation: 1 },
    tabText: { color: '#64748B', fontWeight: '600', fontSize: 14 }, tabTextActive: { color: '#1E3A5F' },
    yearDropdown: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E2E8F0', elevation: 1, marginBottom: 8 },
    yearDropdownText: { fontSize: 16, fontWeight: '600', color: '#1E3A5F' },
    yearDropdownArrow: { fontSize: 16, color: '#94A3B8' },
    monthScroll: { marginBottom: 12 },
    pill: { backgroundColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, marginRight: 6 },
    pillActive: { backgroundColor: '#2563EB' },
    pillText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    pillTextActive: { color: '#FFFFFF' },
    searchInput: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, fontSize: 15, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 4 },
    dropdown: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12, overflow: 'hidden', elevation: 3 },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    dropdownAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1E3A5F', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    dropdownAvatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
    dropdownName: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
    dropdownEmail: { fontSize: 12, color: '#94A3B8' },
    dropdownEmpty: { padding: 12, color: '#94A3B8', textAlign: 'center', fontSize: 14 },
    emptySearch: { alignItems: 'center', paddingVertical: 32 },
    emptyIcon: { fontSize: 40, marginBottom: 8 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
    emptyHint: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
    newBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 12 },
    newBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
    form: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, marginBottom: 16, elevation: 2 },
    formTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 8 },
    typeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    typeBtn: { flex: 1, borderRadius: 8, padding: 10, alignItems: 'center', backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E2E8F0' },
    typeIncome: { backgroundColor: '#22C55E', borderColor: '#22C55E' }, typeExpense: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
    typeText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    input: { backgroundColor: 'transparent', borderRadius: 8, padding: 10, fontSize: 14, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 8 },
    submitBtn: { backgroundColor: '#22C55E', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 4 },
    submitText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
    entry: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    entryIcon: { fontSize: 18, marginRight: 10 }, entryInfo: { flex: 1 },
    entryDesc: { fontSize: 14, fontWeight: '600', color: '#0F172A' }, entryMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
    entryAmount: { fontSize: 14, fontWeight: 'bold' },
    memberHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 12 },
    memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E3A5F', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    memberAvatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    memberName: { fontSize: 16, fontWeight: 'bold', color: '#0F172A' },
    memberStats: { fontSize: 12, color: '#64748B', marginTop: 2 },
    dueRow: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, marginBottom: 6, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4, elevation: 1 },
    dueMonth: { fontSize: 14, fontWeight: '600', color: '#0F172A', flex: 1 },
    dueAmount: { fontSize: 14, fontWeight: 'bold', color: '#334155', marginRight: 8 },
    dueBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    hint: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 12, marginBottom: 20 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 40 },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 300 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F', textAlign: 'center', marginBottom: 12 },
    yearOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 10, marginBottom: 4 },
    yearOptionActive: { backgroundColor: '#EFF6FF' },
    yearOptionText: { fontSize: 18, fontWeight: '500', color: '#334155' },
    yearOptionTextActive: { color: '#2563EB', fontWeight: 'bold' },
    yearCheck: { fontSize: 18, color: '#2563EB', fontWeight: 'bold' },
    modalContentWide: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 350 },
    modalSub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 4 },
    reasonRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
    reasonBtn: { flex: 1, backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
    reasonBtnActive: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
    reasonText: { fontSize: 12, fontWeight: '500', color: '#64748B' },
    reasonTextActive: { color: '#B91C1C', fontWeight: 'bold' },
    modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
    cancelBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10 },
    cancelText: { color: '#64748B', fontWeight: '600' },
    rejectConfirmBtn: { flex: 1, padding: 12, alignItems: 'center', backgroundColor: '#EF4444', borderRadius: 10 },
    rejectConfirmText: { color: '#FFFFFF', fontWeight: 'bold' },
    pendingContainer: { backgroundColor: '#FFFBEB', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A', elevation: 1 },
    pendingHeader: { fontSize: 13, fontWeight: 'bold', color: '#D97706', marginBottom: 8 },
    pendingCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 10, borderRadius: 8, marginBottom: 6, elevation: 1 },
    pendingAvatarText: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F59E0B', color: '#FFFFFF', textAlign: 'center', lineHeight: 32, fontWeight: 'bold', fontSize: 14, overflow: 'hidden' },
    pendingName: { fontSize: 14, fontWeight: 'bold', color: '#1E3A5F' },
    pendingDesc: { fontSize: 12, color: '#64748B' },
});




