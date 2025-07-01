// app/index.tsx
import React, { useEffect, useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator } from 'react-native';
import { AuthProvider } from '../src/context/AuthContext';
import AppNavigator from '../src/navigation/AppNavigator';
import apiService from '../src/services/apiService';
import { getEnvironmentInfo } from '../src/config/environment';

export default function Index() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing BiQuery Mobile App...');
      
      // API Service'i environment'a göre yapılandır
      await apiService.initialize
      
      // Environment bilgilerini logla
      const envInfo = await getEnvironmentInfo();
      console.log('📱 Environment Info:', envInfo);
      
      setIsInitialized(true);
    } catch (error: any) {
      console.error('❌ App initialization failed:', error);
      setInitError(error.message || 'Uygulama başlatılamadı');
    }
  };

  // Loading ekranı
  if (!isInitialized) {
    return (
      <SafeAreaProvider>
        <PaperProvider>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
              {initError ? 'Hata: ' + initError : 'BiQuery başlatılıyor...'}
            </Text>
            {initError && (
              <Text style={{ marginTop: 8, fontSize: 12, color: '#999', textAlign: 'center', paddingHorizontal: 20 }}>
                Ağ bağlantınızı kontrol edin veya VPN bağlantısı gerekebilir.
              </Text>
            )}
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  // Ana uygulama
  return (
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}