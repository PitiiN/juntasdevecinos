import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MoreMenuScreen from '../screens/user/MoreScreen';
import SolicitudesScreen from '../screens/user/SolicitudesScreen';
import MySolicitudesScreen from '../screens/user/MySolicitudesScreen';
import SolicitudDetailScreen from '../screens/shared/SolicitudDetailScreen';
import NeighborhoodMapScreen from '../screens/user/NeighborhoodMapScreen';
import DocumentsScreen from '../screens/user/DocumentsScreen';
import DuesScreen from '../screens/user/DuesScreen';
import ProfileScreen from '../screens/user/ProfileScreen';
import AccessibilityScreen from '../screens/user/AccessibilityScreen';
import FavoresScreen from '../screens/user/FavoresScreen';
import DirectivaScreen from '../screens/user/DirectivaScreen';
import PollsScreen from '../screens/user/PollsScreen';
import VoucherScreen from '../screens/shared/VoucherScreen';

const Stack = createNativeStackNavigator();

export default function MoreStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="MoreMenu" component={MoreMenuScreen} />
            <Stack.Screen name="Solicitudes" component={MySolicitudesScreen} />
            <Stack.Screen name="NewSolicitud" component={SolicitudesScreen} />
            <Stack.Screen name="SolicitudDetail">{(props) => <SolicitudDetailScreen {...props} route={{ ...props.route, params: { ...props.route.params, isAdmin: false } }} />}</Stack.Screen>
            <Stack.Screen name="NeighborhoodMap" component={NeighborhoodMapScreen} />
            <Stack.Screen name="Documents" component={DocumentsScreen} />
            <Stack.Screen name="Dues" component={DuesScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Accessibility" component={AccessibilityScreen} />
            <Stack.Screen name="Favores" component={FavoresScreen} />
            <Stack.Screen name="Directiva" component={DirectivaScreen} />
            <Stack.Screen name="Polls" component={PollsScreen} />
            <Stack.Screen name="Voucher" component={VoucherScreen} />
        </Stack.Navigator>
    );
}
