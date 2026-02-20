import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { analyzeReceiptWithMindee } from '../services/mindeeOCR';
import { theme } from '../utils/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ReceiptScannerScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>{t('scan.permission_required')}</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>{t('scan.grant_permission')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            navigation.goBack();
          }}
        >
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;
    try {
      setAnalyzing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (!photo) throw new Error('No photo taken');
      const receiptData = await analyzeReceiptWithMindee(photo.uri);
      setAnalyzing(false);
      navigation.navigate('NewSplit', { receiptData });
    } catch {
      setAnalyzing(false);
      Alert.alert('Error', 'Failed to scan receipt. Please try again.');
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        setAnalyzing(true);
        const receiptData = await analyzeReceiptWithMindee(result.assets[0].uri);
        setAnalyzing(false);
        navigation.navigate('NewSplit', { receiptData });
      } catch {
        setAnalyzing(false);
        Alert.alert('Error', 'Failed to scan receipt. Please try again.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera}>
        {analyzing && (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.analyzingText}>{t('scan.analyzing')}</Text>
          </View>
        )}

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handlePickImage}
            disabled={analyzing}
          >
            <Ionicons name="images" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleTakePicture}
            disabled={analyzing}
          >
            <View style={styles.captureInner} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => {
              navigation.goBack();
            }}
          >
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  camera: { flex: 1, width: '100%' },
  message: {
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 20,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '600',
  },
});
