import { Alert, Platform, ToastAndroid } from 'react-native';

export interface ToastOptions {
  duration?: number;
  position?: 'top' | 'center' | 'bottom';
}

export const showSuccessToast = (message: string, options: ToastOptions = {}) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(`✅ ${message}`, ToastAndroid.SHORT);
  } else {
    Alert.alert('Başarılı', message);
  }
};

export const showErrorToast = (message: string, options: ToastOptions = {}) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(`❌ ${message}`, ToastAndroid.LONG);
  } else {
    Alert.alert('Hata', message);
  }
};

export const showWarningToast = (message: string, options: ToastOptions = {}) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(`⚠️ ${message}`, ToastAndroid.SHORT);
  } else {
    Alert.alert('Uyarı', message);
  }
};

export const showInfoToast = (message: string, options: ToastOptions = {}) => {
  if (Platform.OS === 'android') {
    ToastAndroid.show(`ℹ️ ${message}`, ToastAndroid.SHORT);
  } else {
    Alert.alert('Bilgi', message);
  }
};