// src/utils/i18n.ts - Improved version with better error handling and performance
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import JSON translations
import trTranslations from '../locales/tr.json';
import enTranslations from '../locales/en.json';
import deTranslations from '../locales/de.json';
import esTranslations from '../locales/es.json';

export type SupportedLanguage = 'tr' | 'en' | 'de' | 'es';

// Language metadata for better UX
export interface LanguageMetadata {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  isRTL: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageMetadata[] = [
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷', isRTL: false },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', isRTL: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', isRTL: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', isRTL: false }
];

const translations = {
  tr: trTranslations,
  en: enTranslations,
  de: deTranslations,
  es: esTranslations
};

// Cache for translation lookups to improve performance
const translationCache = new Map<string, string>();

class I18nService {
  private currentLanguage: SupportedLanguage = 'tr';
  private fallbackLanguage: SupportedLanguage = 'en';
  private translations = translations;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    // Prevent multiple initializations
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.performInit();
    return this.initPromise;
  }

  private async performInit(): Promise<void> {
    try {
      console.log('🚀 Initializing i18n service...');
      
      // Clear cache on init
      translationCache.clear();
      
      // 1. Check for manual language selection first (highest priority)
      const manualLanguage = await AsyncStorage.getItem('user_selected_language');
      if (manualLanguage && this.isSupportedLanguage(manualLanguage)) {
        console.log('👤 Using manually selected language:', manualLanguage);
        this.currentLanguage = manualLanguage as SupportedLanguage;
        this.isInitialized = true;
        return;
      }

      // 2. Detect device language
      const deviceLanguage = this.detectDeviceLanguage();
      console.log('📱 Device language detected:', deviceLanguage);
      
      // 3. Check if we've already detected and saved this language
      const savedLanguage = await AsyncStorage.getItem('detected_language');
      if (savedLanguage && this.isSupportedLanguage(savedLanguage) && savedLanguage === deviceLanguage) {
        console.log('🔍 Using saved detected language:', savedLanguage);
        this.currentLanguage = savedLanguage as SupportedLanguage;
      } else {
        // 4. Use fresh device detection
        console.log('✨ Using fresh device language detection:', deviceLanguage);
        this.currentLanguage = deviceLanguage;
        await AsyncStorage.setItem('detected_language', deviceLanguage);
      }
      
      this.isInitialized = true;
      console.log('✅ i18n initialized successfully with language:', this.currentLanguage);
      
    } catch (error) {
      console.error('🚨 i18n initialization failed:', error);
      // Fallback to default
      this.currentLanguage = 'tr';
      this.isInitialized = true;
    }
  }

  private detectDeviceLanguage(): SupportedLanguage {
    try {
      const locales = Localization.getLocales();
      
      if (!locales || locales.length === 0) {
        console.warn('⚠️ No locales detected, using fallback');
        return 'tr';
      }

      // Check primary locale first
      const primaryLocale = locales[0];
      if (primaryLocale?.languageCode && this.isSupportedLanguage(primaryLocale.languageCode)) {
        console.log('✅ Primary locale supported:', primaryLocale.languageCode);
        return primaryLocale.languageCode as SupportedLanguage;
      }

      // Check all locales for supported languages
      for (const locale of locales) {
        if (locale?.languageCode && this.isSupportedLanguage(locale.languageCode)) {
          console.log('✅ Found supported locale:', locale.languageCode);
          return locale.languageCode as SupportedLanguage;
        }
      }

      console.log('🔄 No supported language found, falling back to Turkish');
      return 'tr';
      
    } catch (error) {
      console.error('🚨 Error detecting device language:', error);
      return 'tr';
    }
  }

  private isSupportedLanguage(lang: string): boolean {
    return SUPPORTED_LANGUAGES.some(l => l.code === lang);
  }

  async setLanguage(language: string, isManualSelection: boolean = false): Promise<void> {
    if (!this.isSupportedLanguage(language)) {
      console.warn('🚨 Attempt to set unsupported language:', language);
      throw new Error(`Unsupported language: ${language}`);
    }

    const oldLanguage = this.currentLanguage;
    this.currentLanguage = language as SupportedLanguage;
    
    // Clear translation cache when language changes
    if (oldLanguage !== this.currentLanguage) {
      translationCache.clear();
    }

    try {
      if (isManualSelection) {
        console.log('👤 User manually selected language:', language);
        await AsyncStorage.setItem('user_selected_language', language);
        await AsyncStorage.setItem('has_manual_selection', 'true');
      }
      
      console.log('✅ Language successfully changed to:', language);
    } catch (error) {
      console.error('🚨 Error saving language preference:', error);
      // Don't throw here, just log the error
    }
  }

  getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  async hasUserManuallySelectedLanguage(): Promise<boolean> {
    try {
      const hasManualSelection = await AsyncStorage.getItem('has_manual_selection');
      return hasManualSelection === 'true';
    } catch (error) {
      console.error('🚨 Error checking manual selection status:', error);
      return false;
    }
  }

  getCurrentLanguageMetadata(): LanguageMetadata {
    return SUPPORTED_LANGUAGES.find(lang => lang.code === this.currentLanguage) || SUPPORTED_LANGUAGES[0];
  }

  // Enhanced translation function with better error handling and caching
  t(key: string, params?: { [key: string]: string | number }): string {
    // Create cache key
    const cacheKey = params ? `${key}:${this.currentLanguage}:${JSON.stringify(params)}` : `${key}:${this.currentLanguage}`;
    
    // Check cache first
    const cachedValue = translationCache.get(cacheKey);
    if (cachedValue) {
      return cachedValue;
    }

    // Try to get translation for current language
    let result = this.getTranslationValue(key, this.currentLanguage);
    
    // If not found, try fallback language
    if (result === key && this.currentLanguage !== this.fallbackLanguage) {
      console.warn(`🔍 Translation not found for key "${key}" in ${this.currentLanguage}, trying fallback`);
      result = this.getTranslationValue(key, this.fallbackLanguage);
    }

    // Apply parameter substitution if needed
    if (typeof result === 'string' && params) {
      result = this.applyParameters(result, params);
    }

    // Cache the result
    translationCache.set(cacheKey, result);
    
    return result;
  }

  private getTranslationValue(key: string, language: SupportedLanguage): string {
    const keys = key.split('.');
    let value: any = this.translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Translation not found
        if (language === this.currentLanguage) {
          console.warn(`🚨 Translation key not found: "${key}" for language: ${language}`);
        }
        return key; // Return key as fallback
      }
    }
    
    if (typeof value === 'string') {
      return value;
    }
    
    console.warn(`🚨 Translation value is not a string for key: "${key}"`);
    return key;
  }

  private applyParameters(text: string, params: { [key: string]: string | number }): string {
    let result = text;
    
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      // Support both {param} and {{param}} formats
      const patterns = [
        new RegExp(`\\{${paramKey}\\}`, 'g'),
        new RegExp(`\\{\\{${paramKey}\\}\\}`, 'g')
      ];
      
      patterns.forEach(pattern => {
        result = result.replace(pattern, String(paramValue));
      });
    });
    
    return result;
  }

  // Utility methods for components
  getSupportedLanguages(): LanguageMetadata[] {
    return SUPPORTED_LANGUAGES;
  }

  // Reset all language preferences (useful for logout)
  async resetLanguagePreferences(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'user_selected_language',
        'has_manual_selection',
        'detected_language'
      ]);
      translationCache.clear();
      this.isInitialized = false;
      this.initPromise = null;
      console.log('🔄 Language preferences reset');
    } catch (error) {
      console.error('🚨 Error resetting language preferences:', error);
    }
  }

  // Check if i18n is ready to use
  isReady(): boolean {
    return this.isInitialized;
  }

  // Get missing translation keys (useful for development)
  getMissingKeys(): string[] {
    // This would be implemented to track missing translation keys
    // For production, this can be disabled
    return [];
  }

  // Validate translations completeness (development helper)
  validateTranslations(): { [language: string]: string[] } {
    const missingKeys: { [language: string]: string[] } = {};
    
    // Implementation would check all languages against a reference
    // and report missing keys
    
    return missingKeys;
  }
}

export const i18n = new I18nService();