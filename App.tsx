// App.tsx
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';

// Toast özelleştirmesi
const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={{ 
        borderLeftColor: '#10b981',
        backgroundColor: '#f0fdf4',
        borderLeftWidth: 5,
        height: 70,
      }}
      contentContainerStyle={{ 
        paddingHorizontal: 15,
        backgroundColor: '#f0fdf4', 
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#065f46',
      }}
      text2Style={{
        fontSize: 14,
        color: '#047857',
      }}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ 
        borderLeftColor: '#ef4444',
        backgroundColor: '#fef2f2',
        borderLeftWidth: 5,
        height: 70,
      }}
      contentContainerStyle={{ 
        paddingHorizontal: 15,
        backgroundColor: '#fef2f2',
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#991b1b',
      }}
      text2Style={{
        fontSize: 14,
        color: '#dc2626',
      }}
    />
  ),
  info: (props: any) => (
    <BaseToast
      {...props}
      style={{ 
        borderLeftColor: '#3b82f6',
        backgroundColor: '#eff6ff',
        borderLeftWidth: 5,
        height: 70,
      }}
      contentContainerStyle={{ 
        paddingHorizontal: 15,
        backgroundColor: '#eff6ff',
      }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#1e40af',
      }}
      text2Style={{
        fontSize: 14,
        color: '#2563eb',
      }}
    />
  ),
};

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppNavigator />
          {/* Toast component'i en üstte olmalı - özelleştirilmiş config ile */}
          <Toast config={toastConfig} />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}