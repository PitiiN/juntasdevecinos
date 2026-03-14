import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from '../screens/admin/DashboardScreen';
import ManageAnnouncementsScreen from '../screens/admin/ManageAnnouncementsScreen';
import AdminSolicitudesScreen from '../screens/admin/AdminSolicitudesScreen';
import SolicitudDetailScreen from '../screens/shared/SolicitudDetailScreen';
import AdminDocumentsScreen from '../screens/admin/AdminDocumentsScreen';
import AdminMoreStack from './AdminMoreStack';
import { useAuth } from '../context/AuthContext';
import { useTicketCounters } from '../hooks/useTicketCounters';

const Tab = createBottomTabNavigator();
const SolStack = createNativeStackNavigator();

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

function SolicitudesStack() {
    return (
        <SolStack.Navigator screenOptions={{ headerShown: false }}>
            <SolStack.Screen name="SolicitudesList" component={AdminSolicitudesScreen} />
            <SolStack.Screen name="AdminSolicitudDetail" component={SolicitudDetailScreen} />
        </SolStack.Navigator>
    );
}

export default function AdminTabs() {
    const insets = useSafeAreaInsets();
    const { organizationId } = useAuth();
    const { adminUnreadCount: unreadSol } = useTicketCounters(organizationId);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0', height: 56 + insets.bottom, paddingBottom: insets.bottom, paddingTop: 6 },
                tabBarActiveTintColor: '#7C3AED',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tab.Screen name="Panel" component={DashboardScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>📊</Text> }} />
            <Tab.Screen name="Avisos" component={ManageAnnouncementsScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>📢</Text> }} />
            <Tab.Screen name="Solicitudes" component={SolicitudesStack} options={{ tabBarIcon: () => <BadgeIcon emoji="📝" count={unreadSol} /> }} />
            <Tab.Screen name="Docs" component={AdminDocumentsScreen} options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>📁</Text> }} />
            <Tab.Screen
                name="Admin"
                component={AdminMoreStack}
                options={{ tabBarIcon: () => <Text style={{ fontSize: 22 }}>⚙️</Text> }}
                listeners={({ navigation }) => ({
                    tabPress: (e) => {
                        e.preventDefault();
                        navigation.navigate('Admin', { screen: 'AdminMenu' });
                    },
                })}
            />
        </Tab.Navigator>
    );
}
