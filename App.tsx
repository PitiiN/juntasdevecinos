import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/queryClient';
import { AuthProvider } from './src/context/AuthContext';
import { AccessibilityProvider, useAccessibility } from './src/context/AccessibilityContext';
import RootNavigator from './src/navigation/RootNavigator';

import { Platform } from 'react-native';

// --- Notifications Setup ---
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance?.MAX || 5, // Fallback if MAX fails to resolve
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    }).catch(console.warn);
  }
}
// ----------------------------

// Wrapper to natively scale the entire app layout engine proportionately
function AccessibilitySyncer({ children }: { children: React.ReactNode }) {
  const { fontScale, highContrast } = useAccessibility();

  return (
    <View style={{ flex: 1, backgroundColor: highContrast ? '#000000' : '#F8FAFC', justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: `${100 / fontScale}%`, height: `${100 / fontScale}%`, transform: [{ scale: fontScale }] }}>
        {children}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AccessibilityProvider>
            <AccessibilitySyncer>
              <RootNavigator />
              <StatusBar style="light" />
            </AccessibilitySyncer>
          </AccessibilityProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
