// src/utils/i18n.ts (Mevcut LanguageContext'e uygun)
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import JSON translations
import trTranslations from '../locales/tr.json';
import enTranslations from '../locales/en.json';
import deTranslations from '../locales/de.json';
import esTranslations from '../locales/es.json';

export type SupportedLanguage = 'tr' | 'en' | 'de' | 'es';

const translations = {
  tr: trTranslations,
  en: enTranslations,
  de: deTranslations,
  es: esTranslations
};

class I18nService {
  private currentLanguage: SupportedLanguage = 'tr';
  private translations = translations;

  async init(): Promise<void> {
    console.log('🚀 Initializing i18n service...');
    
    // DEBUG: Cihaz dilini her zaman göster
    const deviceLanguage = this.detectDeviceLanguage();
    console.log('📱 Device language detected:', deviceLanguage);
    
    // 1. Önce manuel seçimi kontrol et
    const manualLanguage = await AsyncStorage.getItem('language');
    if (manualLanguage && this.isSupportedLanguage(manualLanguage)) {
      console.log('👤 User has manually selected language:', manualLanguage);
      console.log('🔄 Skipping device language detection due to manual selection');
      this.currentLanguage = manualLanguage as SupportedLanguage;
      return;
    }

    // 2. Otomatik tespit edilen dili kontrol et
    const detectedLanguage = await AsyncStorage.getItem('detectedLanguage');
    if (detectedLanguage && this.isSupportedLanguage(detectedLanguage)) {
      console.log('🔍 Using previously detected language:', detectedLanguage);
      console.log('📱 But device language is actually:', deviceLanguage);
      this.currentLanguage = detectedLanguage as SupportedLanguage;
      return;
    }

    // 3. Cihaz dilini kullan
    console.log('✨ Using fresh device language detection:', deviceLanguage);
    this.currentLanguage = deviceLanguage;
    await AsyncStorage.setItem('detectedLanguage', deviceLanguage);
    
    console.log('✅ i18n initialized with language:', this.currentLanguage);
  }

  private detectDeviceLanguage(): SupportedLanguage {
    const locales = Localization.getLocales();
    const primaryLocale = locales[0];
    
    if (primaryLocale && primaryLocale.languageCode) {
      const languageCode = primaryLocale.languageCode;
      console.log('🌐 Primary device locale:', languageCode);
      
      if (this.isSupportedLanguage(languageCode)) {
        return languageCode as SupportedLanguage;
      }
    }
    
    // Fallback to Turkish
    console.log('🔄 Falling back to Turkish (tr)');
    return 'tr';
  }

  private isSupportedLanguage(lang: string): boolean {
    return ['tr', 'en', 'de', 'es'].includes(lang);
  }

  async setLanguage(language: string, isManualSelection: boolean = false): Promise<void> {
    if (!this.isSupportedLanguage(language)) {
      console.warn('🚨 Unsupported language:', language);
      return;
    }

    console.log('🌐 Setting language to:', language, isManualSelection ? '(manual)' : '(auto)');
    this.currentLanguage = language as SupportedLanguage;
    
    if (isManualSelection) {
      await AsyncStorage.setItem('language', language);
      await AsyncStorage.setItem('hasManualSelection', 'true');
    }
  }

  getLanguage(): string {
    return this.currentLanguage;
  }

  async hasUserManuallySelectedLanguage(): Promise<boolean> {
    const hasManualSelection = await AsyncStorage.getItem('hasManualSelection');
    return hasManualSelection === 'true';
  }

  t(key: string, params?: { [key: string]: string | number }): string {
    const keys = key.split('.');
    let value: any = this.translations[this.currentLanguage];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`🚨 Translation key not found: ${key} for language: ${this.currentLanguage}`);
        return key; // Return key as fallback
      }
    }
    
    if (typeof value === 'string') {
      // Simple parameter replacement
      if (params) {
        let result = value;
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          result = result.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
        });
        return result;
      }
      return value;
    }
    
    return key;
  }
}

export const i18n = new I18nService();