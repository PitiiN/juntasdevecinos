import React, { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { ActivityIndicator, View, Text } from 'react-native';
import * as Linking from 'expo-linking';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';

import AuthStack from './AuthStack';
import UserTabs from './UserTabs';
import AdminTabs from './AdminTabs';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';

const prefix = Linking.createURL('/');

export default function RootNavigator() {
    const { session, isLoading, isAdmin, isSuperadmin, viewMode, hasApprovedAccess } = useAuth();
    const { fontScale, highContrast } = useAccessibility();
    const [isReady, setIsReady] = useState(false);

    const linking = {
        prefixes: [prefix, 'jjvv://'],
        config: {
            screens: {},
        },
    };

    const customTheme = {
        ...(highContrast ? DarkTheme : DefaultTheme),
        colors: {
            ...(highContrast ? DarkTheme.colors : DefaultTheme.colors),
            background: highContrast ? '#000000' : '#F8FAFC',
            text: highContrast ? '#FFFFFF' : '#1E3A5F',
        },
        // Custom property to force theme object identity change -> triggers re-render of all screens
        fontScale,
    };

    useEffect(() => {
        if (!isLoading) {
            setIsReady(true);
        }
    }, [isLoading]);

    if (!isReady || isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E3A5F' }}>
                <ActivityIndicator size="large" color="#ffffff" />
                <Text style={{ marginTop: 20, color: '#ffffff', fontSize: 18 }}>Cargando JJVV...</Text>
            </View>
        );
    }

    return (
        <NavigationContainer linking={linking} theme={customTheme as any}>
            {!session ? (
                <AuthStack />
            ) : !hasApprovedAccess ? (
                <PendingApprovalScreen />
            ) : isAdmin && (!isSuperadmin || viewMode === 'admin') ? (
                <AdminTabs />
            ) : (
                <UserTabs />
            )}
        </NavigationContainer>
    );
}
