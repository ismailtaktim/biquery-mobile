import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { i18n } from '../utils/i18n';
import apiService from '../services/apiService';

interface LanguageContextType {
  currentLanguage: string;
  changeLanguage: (language: string) => Promise<void>;
  t: (key: string, params?: { [key: string]: string | number }) => string;
  isLoading: boolean;
  hasUserManuallySelected: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState('tr');
  const [isLoading, setIsLoading] = useState(true);
  const [hasUserManuallySelected, setHasUserManuallySelected] = useState(false);

  useEffect(() => {
    initializeLanguage();
  }, []);

  const initializeLanguage = async () => {
    try {
      setIsLoading(true);
      console.log('🚀 Starting language initialization...');
      
      // i18n servisini başlat (otomatik dil tespiti dahil)
      await i18n.init();
      
      // Mevcut dili al
      const detectedLanguage = i18n.getLanguage();
      setCurrentLanguage(detectedLanguage);
      
      // Kullanıcının manuel seçim yapıp yapmadığını kontrol et
      const hasManualSelection = await i18n.hasUserManuallySelectedLanguage();
      setHasUserManuallySelected(hasManualSelection);
      
      console.log('✅ Language initialization complete:', {
        language: detectedLanguage,
        hasManualSelection
      });
      
    } catch (error) {
      console.error('🚨 Language initialization error:', error);
      // Fallback
      setCurrentLanguage('tr');
      setHasUserManuallySelected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = async (language: string) => {
    try {
      console.log('🔄 Changing language to:', language);
      
      // Kullanıcı manuel seçim yapıyor
      await i18n.setLanguage(language, true);
      setCurrentLanguage(language);
      setHasUserManuallySelected(true);
      
      // API'ye dil değişikliğini bildir
      try {
        await apiService.setLanguage(language);
        console.log('✅ Language updated on server');
      } catch (error) {
        console.warn('⚠️ API dil ayarı güncellenemedi:', error);
      }
      
    } catch (error) {
      console.error('🚨 Language change error:', error);
    }
  };

  const t = (key: string, params?: { [key: string]: string | number }) => {
    return i18n.t(key, params);
  };

  const value: LanguageContextType = {
    currentLanguage,
    changeLanguage,
    t,
    isLoading,
    hasUserManuallySelected
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};