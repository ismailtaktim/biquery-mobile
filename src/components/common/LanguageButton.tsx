// src/components/common/LanguageButton.tsx - Fixed version
import React, { useState } from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  View,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageSelection, useTranslation } from '../../context/LanguageContext';
import { SupportedLanguage } from '../../utils/i18n';
import LanguageSelector from './LanguageSelector';

interface LanguageButtonProps {
  variant?: 'default' | 'compact' | 'icon-only';
  showLanguageName?: boolean;
  style?: any;
  onLanguageChange?: (language: string) => void;
}

const LanguageButton: React.FC<LanguageButtonProps> = ({ 
  variant = 'default',
  showLanguageName = false,
  style,
  onLanguageChange
}) => {
  const { t } = useTranslation();
  const { 
    currentLanguage, 
    supportedLanguages, 
    isChangingLanguage,
    error 
  } = useLanguageSelection();

  const [showSelector, setShowSelector] = useState(false);

  // Get current language metadata - fixed to handle undefined
  const getCurrentLanguageData = () => {
    const languageData = supportedLanguages.find(lang => lang.code === currentLanguage);
    // Fallback if language not found
    return languageData || {
      code: currentLanguage as SupportedLanguage,
      name: 'Unknown',
      nativeName: currentLanguage.toUpperCase(),
      flag: '🌐',
      isRTL: false
    };
  };

  const currentLanguageData = getCurrentLanguageData();

  const handlePress = () => {
    if (isChangingLanguage) {
      Alert.alert(
        t('common.info'),
        t('language.changeInProgress'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    setShowSelector(true);
  };

  const handleLanguageChanged = () => {
    if (onLanguageChange && currentLanguageData) {
      onLanguageChange(currentLanguageData.code);
    }
  };

  const handleSelectorClose = () => {
    setShowSelector(false);
    handleLanguageChanged();
  };

  const renderContent = () => {
    if (isChangingLanguage) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3B82F6" />
          {variant !== 'icon-only' && (
            <Text style={styles.loadingText}>{t('language.changing')}</Text>
          )}
        </View>
      );
    }

    switch (variant) {
      case 'icon-only':
        return (
          <Text style={styles.languageFlag}>
            {currentLanguageData.flag}
          </Text>
        );

      case 'compact':
        return (
          <View style={styles.compactContent}>
            <Text style={styles.languageFlag}>
              {currentLanguageData.flag}
            </Text>
            <Text style={styles.languageCode}>
              {currentLanguage.toUpperCase()}
            </Text>
          </View>
        );

      default:
        return (
          <View style={styles.defaultContent}>
            <Text style={styles.languageFlag}>
              {currentLanguageData.flag}
            </Text>
            {showLanguageName && (
              <Text style={styles.languageName}>
                {currentLanguageData.nativeName}
              </Text>
            )}
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </View>
        );
    }
  };

  const getButtonStyle = () => {
    const baseStyle = [styles.languageButton];
    
    switch (variant) {
      case 'icon-only':
        baseStyle.push(styles.iconOnlyButton);
        break;
      case 'compact':
        baseStyle.push(styles.compactButton);
        break;
      default:
        baseStyle.push(styles.defaultButton);
        break;
    }

    if (isChangingLanguage) {
      baseStyle.push(styles.changingButton);
    }

    if (error) {
      baseStyle.push(styles.errorButton);
    }

    return baseStyle;
  };

  return (
    <>
      <TouchableOpacity 
        style={[...getButtonStyle(), style]}
        onPress={handlePress}
        disabled={isChangingLanguage}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={t('language.selectTitle')}
        accessibilityHint={`${t('language.current')}: ${currentLanguageData.nativeName}`}
      >
        {renderContent()}
      </TouchableOpacity>

      <LanguageSelector 
        visible={showSelector}
        onClose={handleSelectorClose}
        compactMode={variant === 'compact'}
      />
    </>
  );
};

const styles = StyleSheet.create({
  languageButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  // Fixed: Added all required properties from languageButton base style
  defaultButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  // Fixed: Added all required properties from languageButton base style
  compactButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 6,
    minWidth: 60,
  },
  // Fixed: Added all required properties from languageButton base style
  iconOnlyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 8,
    minWidth: 40,
    minHeight: 40,
  },
  // Fixed: Added all required properties from languageButton base style
  changingButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#EBF4FF',
    borderColor: '#3B82F6',
  },
  // Fixed: Added all required properties from languageButton base style
  errorButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  defaultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  languageFlag: {
    fontSize: 18,
  },
  languageName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    maxWidth: 80,
  },
  languageCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  loadingText: {
    fontSize: 12,
    color: '#3B82F6',
  },
});

export default LanguageButton;