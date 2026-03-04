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

const Tab = createBottomTabNavigator();

function BadgeIcon({ emoji, count }: { emoji: string; count: number }) {
    return (
        <View style={{ position: 'relative' }}>
            <Text style={{ fontSize: 22 }}>{emoji}</Text>
            {count > 0 && (
                <View style={b.badge}><Text style={b.badgeText}>{count > 9 ? '9+' : count}</Text></View>
            )}
        </View>
    );
}

const b = StyleSheet.create({
    badge: { position: 'absolute', top: -4, right: -10, backgroundColor: '#EF4444', borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
});

export default function UserTabs() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const solicitudes = useAppStore(s => s.solicitudes);
    const announcements = useAppStore(s => s.announcements);
    const documents = useAppStore(s => s.documents);
    const seenAvisosCount = useAppStore(s => s.seenAvisosCount);
    const seenDocsCount = useAppStore(s => s.seenDocsCount);

    const mySolicitudes = solicitudes.filter(s => s.userEmail === user?.email || s.user === user?.user_metadata?.full_name);
    const unreadSolicitudes = mySolicitudes.filter(s => !s.seenByUser).length;
    const unreadAvisos = Math.max(0, announcements.length - seenAvisosCount);
    const unreadDocs = Math.max(0, documents.length - seenDocsCount);
    const unreadMore = unreadSolicitudes + unreadDocs;

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', height: 56 + insets.bottom, paddingBottom: insets.bottom, paddingTop: 6 },
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tab.Screen name="Inicio" component={HomeScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>🏠</Text> }} />
            <Tab.Screen name="Avisos" component={AnnouncementsScreen} options={{ tabBarIcon: () => <BadgeIcon emoji="📢" count={unreadAvisos} /> }} />
            <Tab.Screen name="S.O.S" component={EmergencyScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>🆘</Text> }} />
            <Tab.Screen name="Agenda" component={EventsScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>📅</Text> }} />
            <Tab.Screen
                name="Más"
                component={MoreStack}
                options={{ tabBarIcon: () => <BadgeIcon emoji="☰" count={unreadMore} /> }}
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        // Reset the Más stack to MoreMenu when tab is pressed
                        e.preventDefault();
                        navigation.navigate('Más', { screen: 'MoreMenu' });
                    },
                })}
            />
        </Tab.Navigator>
    );
}
