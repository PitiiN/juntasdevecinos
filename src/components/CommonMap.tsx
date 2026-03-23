import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MapPin } from '../lib/store';

const MAP_DISCLOSURE_KEY = 'jjvv_map_disclosure_accepted';

// Use MapPin from global store

interface CommonMapProps {
  initialRegion?: Region;
  pins?: MapPin[];
  onMapPress?: (lat: number, lng: number) => void;
  onMarkerPress?: (pin: MapPin) => void;
  style?: any;
  mapRef?: React.RefObject<MapView | null>;
}

export const CommonMap: React.FC<CommonMapProps> = ({
  initialRegion,
  pins = [],
  onMapPress,
  onMarkerPress,
  style,
  mapRef,
}) => {
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [shouldTrackMarkerViewChanges, setShouldTrackMarkerViewChanges] = useState(true);

  useEffect(() => {
    checkDisclosure();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      setShouldTrackMarkerViewChanges(false);
      return;
    }

    if (pins.length === 0) {
      setShouldTrackMarkerViewChanges(false);
      return;
    }

    setShouldTrackMarkerViewChanges(true);
    const timer = setTimeout(() => {
      setShouldTrackMarkerViewChanges(false);
    }, 650);

    return () => clearTimeout(timer);
  }, [pins]);

  const checkDisclosure = async () => {
    try {
      const accepted = await AsyncStorage.getItem(MAP_DISCLOSURE_KEY);
      if (accepted !== 'true') {
        setShowDisclosure(true);
      }
    } catch (e) {
      setShowDisclosure(true);
    }
  };

  const handleAcceptDisclosure = async () => {
    try {
      await AsyncStorage.setItem(MAP_DISCLOSURE_KEY, 'true');
      setShowDisclosure(false);
    } catch (e) {
      setShowDisclosure(false);
    }
  };

  const defaultRegion = initialRegion || {
    latitude: -33.48942,
    longitude: -70.6567,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  };

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={defaultRegion}
        onPress={(e) => {
          if (!onMapPress) return;
          const action = e?.nativeEvent?.action;
          const coordinate = e?.nativeEvent?.coordinate;
          if (action === 'marker-press' || !coordinate) return;

          const latitude = coordinate.latitude;
          const longitude = coordinate.longitude;
          if (typeof latitude !== 'number' || typeof longitude !== 'number') return;

          onMapPress(latitude, longitude);
        }}
      >
        {pins.map((pin, index) => (
          <Marker
            key={pin.id || `pin-${index}`}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            onPress={() => onMarkerPress && onMarkerPress(pin)}
            tracksViewChanges={shouldTrackMarkerViewChanges}
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerEmoji}>{pin.emoji || '📍'}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <Modal visible={showDisclosure} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.disclosureContent}>
            <Text style={styles.disclosureTitle}>📍 Aviso de Privacidad y Mapas</Text>
            <ScrollView style={styles.disclosureScroll}>
                <Text style={styles.disclosureText}>
                  Esta aplicación utiliza servicios de mapas (Google Maps) para permitirte visualizar puntos de interés y servicios en el barrio.
                </Text>
                <Text style={styles.disclosureText}>
                  Al continuar, aceptas que la aplicación muestre tu ubicación (si es permitida) en el mapa y envíe datos de ubicación (coordenadas) a los servicios de Google para este fin.
                </Text>
                <Text style={styles.disclosureText}>
                  No rastreamos tu ubicación en segundo plano ni compartimos tu identidad con terceros con fines publicitarios. Para más detalles, revisa nuestra Política de Privacidad.
                </Text>
            </ScrollView>
            <TouchableOpacity style={styles.disclosureBtn} onPress={handleAcceptDisclosure}>
              <Text style={styles.disclosureBtnText}>Aceptar y Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    backgroundColor: '#FFFFFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2563EB',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  markerEmoji: {
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  disclosureContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  disclosureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 16,
    textAlign: 'center',
  },
  disclosureScroll: {
    marginBottom: 20,
  },
  disclosureText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  disclosureBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  disclosureBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
