import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';

export default function PollsScreen() {
    const polls = useAppStore(s => s.polls);
    const votePoll = useAppStore(s => s.votePoll);
    const { user } = useAuth();

    // Filter non-expired polls
    const activePolls = polls.filter(p => {
        const isPollExpired = new Date() > new Date(p.deadline);
        return !isPollExpired;
    });

    return (
        <SafeAreaView style={s.safe}>
            <View style={s.header}>
                <Text style={s.title}>📊 Encuestas</Text>
            </View>
            <ScrollView contentContainerStyle={s.scroll}>
                {activePolls.length === 0 ? (
                    <View style={s.empty}><Text style={s.emptyText}>No hay encuestas activas por el momento</Text></View>
                ) : (
                    activePolls.map(p => {
                        const isExpired = new Date() > new Date(p.deadline);
                        const userVotesMap = p.userVotes || {};
                        const userVotes = userVotesMap[user?.id || ''] || [];
                        const hasVoted = userVotes.length > 0;
                        const showResults = isExpired || hasVoted;
                        const totalVotes = p.options.reduce((sum, opt) => sum + opt.votes, 0);

                        return (
                            <View key={p.id} style={[s.card, { borderLeftColor: '#3B82F6' }]}>
                                <View style={s.row}>
                                    <Text style={s.pollTitle}>{p.question}</Text>
                                </View>
                                {isExpired ? (
                                    <View style={s.expiredBanner}><Text style={s.expiredText}>⏱️ Esta encuesta ha finalizado.</Text></View>
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                                        <Text style={s.metaText}>Cierra: {p.deadline}</Text>
                                        {p.allowMultiple && (
                                            <View style={s.multiBadge}>
                                                <Text style={s.multiBadgeText}>Respuesta Múltiple</Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                <View style={s.pollOptions}>
                                    {p.options.map(opt => {
                                        const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                                        const isMyVote = userVotes.includes(opt.id);

                                        return (
                                            <TouchableOpacity
                                                key={opt.id}
                                                style={[
                                                    s.pollOptionBtn, 
                                                    isMyVote && s.pollOptionBtnSelected,
                                                    showResults && isExpired && s.pollOptionBtnDisabled
                                                ]}
                                                onPress={() => !isExpired && user?.id && votePoll(p.id, opt.id, user.id)}
                                                disabled={isExpired}
                                                activeOpacity={isExpired ? 1 : 0.7}
                                            >
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', zIndex: 3 }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                        {p.allowMultiple ? (
                                                            <View style={[s.checkbox, isMyVote && s.checkboxSelected]}>
                                                                {isMyVote && <Text style={s.checkSymbol}>✓</Text>}
                                                            </View>
                                                        ) : (
                                                            <View style={[s.radio, isMyVote && s.radioSelected]}>
                                                                {isMyVote && <View style={s.radioInner} />}
                                                            </View>
                                                        )}
                                                        <Text style={[s.pollOptionText, isMyVote && s.pollOptionTextSelected]}>{opt.text}</Text>
                                                    </View>
                                                    {showResults && <Text style={[s.pollOptionText, isMyVote && s.pollOptionTextSelected]}>{percentage}%</Text>}
                                                </View>
                                                {showResults && (
                                                    <View style={[s.pollResultFillBg, { width: `${percentage}%` }]} />
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                <Text style={s.pollFooter}>
                                    {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'} en total
                                    {p.allowMultiple && !isExpired && ' • Puedes elegir varias opciones'}
                                </Text>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#1E3A5F' },
    scroll: { padding: 20 },
    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, color: '#94A3B8' },
    card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, borderLeftWidth: 4, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    pollTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E3A5F', flex: 1, marginBottom: 4 },
    metaText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    multiBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 10 },
    multiBadgeText: { color: '#2563EB', fontSize: 11, fontWeight: '700' },
    expiredBanner: { backgroundColor: '#FEF3C7', padding: 8, borderRadius: 6, marginBottom: 12 },
    expiredText: { color: '#D97706', fontSize: 13, fontWeight: '600' },
    pollOptions: { marginTop: 4 },
    pollOptionBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, marginBottom: 10, alignItems: 'center', position: 'relative', overflow: 'hidden' },
    pollOptionBtnSelected: { borderColor: '#3B82F6', backgroundColor: '#F0F7FF', borderWidth: 1.5 },
    pollOptionBtnDisabled: { opacity: 0.8 },
    pollOptionText: { fontSize: 15, color: '#334155', fontWeight: '500', marginLeft: 10 },
    pollOptionTextSelected: { color: '#1E40AF', fontWeight: '700' },
    pollResultFillBg: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: '#DBEAFE', opacity: 0.4, zIndex: 1 },
    pollFooter: { fontSize: 12, color: '#94A3B8', textAlign: 'right', marginTop: 8 },
    checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
    checkboxSelected: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
    checkSymbol: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
    radioSelected: { borderColor: '#3B82F6' },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3B82F6' },
});
