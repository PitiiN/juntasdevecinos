import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminMoreScreen from '../screens/admin/AdminMoreScreen';
import ManageMembersScreen from '../screens/admin/ManageMembersScreen';
import AdminFinanceScreen from '../screens/admin/AdminFinanceScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import NeighborhoodMapScreen from '../screens/user/NeighborhoodMapScreen';
import FavoresScreen from '../screens/user/FavoresScreen';
import EventsScreen from '../screens/user/EventsScreen';
import DirectivaScreen from '../screens/user/DirectivaScreen';
import PollsScreen from '../screens/user/PollsScreen';
import EmergencyScreen from '../screens/user/EmergencyScreen';
import AccessibilityScreen from '../screens/user/AccessibilityScreen';
import DeleteAccountScreen from '../screens/shared/DeleteAccountScreen';

const Stack = createNativeStackNavigator();

export default function AdminMoreStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AdminMenu" component={AdminMoreScreen} />
            <Stack.Screen name="ManageMembers" component={ManageMembersScreen} />
            <Stack.Screen name="AdminFinance" component={AdminFinanceScreen} />
            <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
            <Stack.Screen name="MapaAdmin" component={NeighborhoodMapScreen} />
            <Stack.Screen name="Favores" component={FavoresScreen} />
            <Stack.Screen name="Agenda" component={EventsScreen} />
            <Stack.Screen name="Directiva" component={DirectivaScreen} />
            <Stack.Screen name="Polls" component={PollsScreen} />
            <Stack.Screen name="Emergency" component={EmergencyScreen} />
            <Stack.Screen name="Accessibility" component={AccessibilityScreen} />
            <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
        </Stack.Navigator>
    );
}
