import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/user/HomeScreen';
import AnnouncementsScreen from '../screens/user/AnnouncementsScreen';
import EmergencyScreen from '../screens/user/EmergencyScreen';
import EventsScreen from '../screens/user/EventsScreen';
import MoreStack from './MoreStack';
import { useAppStore } from '../lib/store';
import { useAuth } from '../context/AuthContext';
import { useTicketCounters } from '../hooks/useTicketCounters';

const Tab = createBottomTabNavigator();

function BadgeIcon({ emoji, count }: { emoji: string; count: number }) {
    return (
        <View style={{ position: 'relative' }}>
            <Text style={s.tabIcon}>{emoji}</Text>
            {count > 0 && (
                <View style={s.badge}><Text style={s.badgeText}>{count > 9 ? '9+' : count}</Text></View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: -4,
        right: -10,
        backgroundColor: '#EF4444',
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
    tabIcon: { fontSize: 22, lineHeight: 24, includeFontPadding: false },
});

export default function UserTabs() {
    const insets = useSafeAreaInsets();
    const { organizationId } = useAuth();
    const announcements = useAppStore((state) => state.announcements);
    const documents = useAppStore((state) => state.documents);
    const seenAvisosCount = useAppStore((state) => state.seenAvisosCount);
    const seenDocsCount = useAppStore((state) => state.seenDocsCount);
    const { myUnreadCount: unreadSolicitudes } = useTicketCounters(organizationId);

    const unreadAvisos = Math.max(0, announcements.length - seenAvisosCount);
    const unreadDocs = Math.max(0, documents.length - seenDocsCount);
    const unreadMore = unreadSolicitudes + unreadDocs;

    return (
        <Tab.Navigator
            backBehavior="history"
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: '#E2E8F0',
                    height: 64 + insets.bottom,
                    paddingBottom: Math.max(insets.bottom, 6),
                    paddingTop: 8,
                },
                tabBarItemStyle: { paddingVertical: 2 },
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 1 },
            }}
        >
            <Tab.Screen name="Inicio" component={HomeScreen} options={{ tabBarIcon: () => <Text style={s.tabIcon}>🏠</Text> }} />
            <Tab.Screen name="Avisos" component={AnnouncementsScreen} options={{ tabBarIcon: () => <BadgeIcon emoji="📢" count={unreadAvisos} /> }} />
            <Tab.Screen name="S.O.S" component={EmergencyScreen} options={{ tabBarIcon: () => <Text style={s.tabIcon}>🆘</Text> }} />
            <Tab.Screen name="Agenda" component={EventsScreen} options={{ tabBarIcon: () => <Text style={s.tabIcon}>📅</Text> }} />
            <Tab.Screen
                name="Más"
                component={MoreStack}
                options={{ tabBarIcon: () => <BadgeIcon emoji="☰" count={unreadMore} /> }}
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('Más', { screen: 'MoreMenu' });
                    },
                })}
            />
        </Tab.Navigator>
    );
}
