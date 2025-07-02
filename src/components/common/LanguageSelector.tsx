// src/components/common/LanguageSelector.tsx - Enhanced with better UX
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageSelection, useTranslation } from '../../context/LanguageContext';
import { SupportedLanguage, LanguageMetadata } from '../../utils/i18n';

const { width, height } = Dimensions.get('window');

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
  showTitle?: boolean;
  compactMode?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  visible, 
  onClose, 
  showTitle = true,
  compactMode = false 
}) => {
  const { t } = useTranslation();
  const { 
    currentLanguage, 
    supportedLanguages, 
    changeLanguage, 
    isChangingLanguage,
    error 
  } = useLanguageSelection();

  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(currentLanguage);
  const [isApplying, setIsApplying] = useState(false);

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(height)).current;

  React.useEffect(() => {
    if (visible) {
      // Reset selected language when modal opens
      setSelectedLanguage(currentLanguage);
      
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim, currentLanguage]);

  const handleLanguageSelect = (language: SupportedLanguage) => {
    setSelectedLanguage(language);
  };

  const handleApplyLanguage = async () => {
    if (selectedLanguage === currentLanguage) {
      onClose();
      return;
    }

    try {
      setIsApplying(true);
      
      await changeLanguage(selectedLanguage);
      
      // Show success feedback
      Alert.alert(
        t('common.success'),
        t('language.changeSuccess'),
        [{ text: t('common.ok'), onPress: onClose }]
      );
      
    } catch (error: any) {
      console.error('Language change failed:', error);
      
      // Reset selection on error
      setSelectedLanguage(currentLanguage);
      
      // Error is already handled in context, just reset state
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    if (isApplying || isChangingLanguage) return;
    onClose();
  };

  const renderLanguageOption = (langData: LanguageMetadata) => {
    const isSelected = selectedLanguage === langData.code;
    const isCurrent = currentLanguage === langData.code;

    return (
      <TouchableOpacity
        key={langData.code}
        style={[
          styles.languageOption,
          isSelected && styles.languageOptionSelected,
          compactMode && styles.languageOptionCompact,
        ]}
        onPress={() => handleLanguageSelect(langData.code)}
        disabled={isApplying || isChangingLanguage}
        activeOpacity={0.7}
      >
        <View style={styles.languageContent}>
          <Text style={styles.languageFlag}>{langData.flag}</Text>
          <View style={styles.languageInfo}>
            <Text style={[
              styles.languageName,
              isSelected && styles.languageNameSelected
            ]}>
              {langData.nativeName}
            </Text>
            {!compactMode && (
              <Text style={[
                styles.languageEnglishName,
                isSelected && styles.languageEnglishNameSelected
              ]}>
                {langData.name}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.languageStatus}>
          {isCurrent && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>{t('language.current')}</Text>
            </View>
          )}
          
          {isSelected && (
            <Ionicons 
              name="checkmark-circle" 
              size={24} 
              color="#10B981" 
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View 
        style={[
          styles.overlay,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouch}
          onPress={handleClose}
          activeOpacity={1}
        />
        
        <Animated.View 
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {showTitle && (
                <>
                  <Ionicons name="language" size={24} color="#3B82F6" />
                  <Text style={styles.title}>{t('language.selectTitle')}</Text>
                </>
              )}
            </View>
            
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isApplying || isChangingLanguage}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Error display */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Language List */}
          <ScrollView 
            style={styles.languageList}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {supportedLanguages.map(renderLanguageOption)}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.cancelButton, (isApplying || isChangingLanguage) && styles.buttonDisabled]}
              onPress={handleClose}
              disabled={isApplying || isChangingLanguage}
            >
              <Text style={[styles.cancelButtonText, (isApplying || isChangingLanguage) && styles.buttonTextDisabled]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.applyButton,
                (isApplying || isChangingLanguage || selectedLanguage === currentLanguage) && styles.buttonDisabled
              ]}
              onPress={handleApplyLanguage}
              disabled={isApplying || isChangingLanguage || selectedLanguage === currentLanguage}
            >
              {(isApplying || isChangingLanguage) ? (
                <View style={styles.loadingContent}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.applyButtonText}>
                    {t('language.applying')}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.applyButtonText, selectedLanguage === currentLanguage && styles.buttonTextDisabled]}>
                  {t('common.apply')}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Language info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              {t('language.restartInfo')}
            </Text>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouch: {
    flex: 1,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: height * 0.8,
    minHeight: height * 0.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  languageList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionSelected: {
    backgroundColor: '#EBF4FF',
    borderColor: '#3B82F6',
  },
  languageOptionCompact: {
    paddingVertical: 12,
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 28,
    marginRight: 16,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  languageNameSelected: {
    color: '#1D4ED8',
  },
  languageEnglishName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  languageEnglishNameSelected: {
    color: '#3B82F6',
  },
  languageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F9FAFB',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default LanguageSelector;