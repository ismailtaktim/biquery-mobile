import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSelector from './LanguageSelector';

// Desteklenen dil tipleri
type SupportedLanguage = 'tr' | 'en' | 'de' | 'es';

// Type guard fonksiyonu
const isSupportedLanguage = (lang: string): lang is SupportedLanguage => {
  return ['tr', 'en', 'de', 'es'].includes(lang);
};

const LanguageButton: React.FC = () => {
  const { currentLanguage } = useLanguage();
  const [showSelector, setShowSelector] = useState(false);

  const getLanguageFlag = (lang: string): string => {
    const flags: Record<SupportedLanguage, string> = {
      tr: '🇹🇷',
      en: '🇬🇧', 
      de: '🇩🇪',
      es: '🇪🇸'
    };

    // Type-safe access
    if (isSupportedLanguage(lang)) {
      return flags[lang];
    }
    
    // Fallback
    return flags.tr;
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.languageButton}
        onPress={() => setShowSelector(true)}
      >
        <Text style={styles.languageFlag}>
          {getLanguageFlag(currentLanguage)}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#6B7280" />
      </TouchableOpacity>

      <LanguageSelector 
        visible={showSelector}
        onClose={() => setShowSelector(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  languageFlag: {
    fontSize: 18,
    marginRight: 4,
  },
});

export default LanguageButton;