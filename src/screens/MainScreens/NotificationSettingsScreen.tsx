import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from '../../context/LanguageContext';
import { periodicNotificationService } from '../../utils/PeriodicNotificationService';

interface FeatureToggle {
  id: string;
  icon: string;
  color: string;
}

const NotificationSettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true); // Başlangıçta açık
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true); // Başlangıçta açık
  const [loading, setLoading] = useState(true);

  const features: FeatureToggle[] = [
    {
      id: 'notifications',
      icon: 'notifications-outline',
      color: '#3B82F6'
    },
    {
      id: 'suggestions',
      icon: 'sparkles-outline',
      color: '#8B5CF6'
    }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      console.log('📱 Loading notification settings...');
      
      // AsyncStorage'dan ayarları yükle
      const savedSettings = await AsyncStorage.getItem('notification_settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        console.log('📱 Loaded settings from storage:', settings);
        
        setNotificationsEnabled(settings.notifications !== undefined ? settings.notifications : true);
        setSuggestionsEnabled(settings.suggestions !== undefined ? settings.suggestions : true);
      } else {
        console.log('📱 No saved settings found, creating defaults (notifications: ON, suggestions: ON)');
        // İlk kez açılıyorsa default olarak AÇIK
        setNotificationsEnabled(true);  // İpuçları AÇIK
        setSuggestionsEnabled(true);    // Öneriler AÇIK
        
        // AsyncStorage'a default ayarları kaydet
        await saveSettings(true, true);
      }
    } catch (error) {
      console.error('📱 Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (notifications: boolean, suggestions: boolean) => {
    try {
      const settings = {
        notifications,
        suggestions
      };
      
      await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
      console.log('📱 Settings saved:', settings);
    } catch (error) {
      console.error('📱 Error saving settings:', error);
    }
  };

  const handleToggle = async (featureId: string, newValue: boolean) => {
    try {
      console.log(`📱 Toggle ${featureId}: ${newValue}`);

      if (featureId === 'notifications') {
        setNotificationsEnabled(newValue);
        
        // PeriodicNotificationService'i güncelle - İPUÇLARI
        await periodicNotificationService.toggleAllNotifications(newValue);
        
        // AsyncStorage'a kaydet
        await saveSettings(newValue, suggestionsEnabled);
        
      } else if (featureId === 'suggestions') {
        setSuggestionsEnabled(newValue);
        
        // PeriodicNotificationService'i güncelle - ÖNERİLER  
        await periodicNotificationService.toggleSuggestions(newValue);
        
        // AsyncStorage'a kaydet
        await saveSettings(notificationsEnabled, newValue);
      }
      
      console.log(`📱 ${featureId} toggle completed: ${newValue}`);
      
    } catch (error) {
      console.error('Toggle error:', error);
      
      // Hata durumunda UI'yi geri al
      if (featureId === 'notifications') {
        setNotificationsEnabled(!newValue);
      } else if (featureId === 'suggestions') {
        setSuggestionsEnabled(!newValue);
      }
    }
  };

  const getFeatureValue = (featureId: string): boolean => {
    switch (featureId) {
      case 'notifications':
        return notificationsEnabled;
      case 'suggestions':
        return suggestionsEnabled;
      default:
        return false;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.title')}</Text>
          <Text style={styles.subtitle}>{t('settings.subtitle')}</Text>
        </View>

        {/* Feature Toggles */}
        <View style={styles.featuresContainer}>
          {features.map((feature) => {
            const isEnabled = getFeatureValue(feature.id);
            
            return (
              <View key={feature.id} style={styles.featureCard}>
                <View style={styles.featureHeader}>
                  <View style={[styles.featureIcon, { backgroundColor: `${feature.color}15` }]}>
                    <Ionicons name={feature.icon as any} size={24} color={feature.color} />
                  </View>
                  <View style={styles.featureInfo}>
                    <Text style={styles.featureTitle}>
                      {t(`settings.features.${feature.id}.title`)}
                    </Text>
                    <Text style={styles.featureDescription}>
                      {t(`settings.features.${feature.id}.description`)}
                    </Text>
                  </View>
                  <Switch
                    value={isEnabled}
                    onValueChange={(value) => handleToggle(feature.id, value)}
                    trackColor={{ false: '#D1D5DB', true: `${feature.color}40` }}
                    thumbColor={isEnabled ? feature.color : '#9CA3AF'}
                    ios_backgroundColor="#D1D5DB"
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Status Info */}
        <View style={styles.statusContainer}>
          <View style={styles.statusHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.statusTitle}>{t('settings.info.title')}</Text>
          </View>
          <Text style={styles.statusDescription}>
            {t('settings.info.description')}
          </Text>
          
          {/* Status Details */}
          <View style={styles.statusDetails}>
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { 
                backgroundColor: notificationsEnabled ? '#10B981' : '#6B7280' 
              }]} />
              <Text style={styles.statusText}>
                İpuçları: {notificationsEnabled ? 'Açık' : 'Kapalı'}
              </Text>
            </View>
            
            <View style={styles.statusItem}>
              <View style={[styles.statusDot, { 
                backgroundColor: suggestionsEnabled ? '#8B5CF6' : '#6B7280' 
              }]} />
              <Text style={styles.statusText}>
                Öneriler: {suggestionsEnabled ? 'Açık' : 'Kapalı'}
              </Text>
            </View>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfoContainer}>
          <Text style={styles.appInfoTitle}>Uygulama Bilgileri</Text>
          <View style={styles.appInfoItem}>
            <Text style={styles.appInfoLabel}>{t('settings.app.lastUpdate')}</Text>
            <Text style={styles.appInfoValue}>2025-01-08</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  featuresContainer: {
    padding: 20,
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  statusContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  statusDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  statusDetails: {
    gap: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  statusText: {
    fontSize: 14,
    color: '#374151',
  },
  appInfoContainer: {
    margin: 20,
    marginTop: 0,
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  appInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  appInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  appInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  appInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});

export default NotificationSettingsScreen;