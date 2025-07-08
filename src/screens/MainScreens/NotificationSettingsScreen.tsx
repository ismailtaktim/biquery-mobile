import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { periodicNotificationService } from '../../utils/PeriodicNotificationService';
import { i18n } from '../../utils/i18n';

interface AppSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  icon: string;
  color: string;
}

const NotificationSettingsScreen = ({ navigation }: any) => {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Sadece 2 ayar: İpuçları ve Öneriler
      const appSettings: AppSetting[] = [
        {
          id: 'notifications',
          title: i18n.t('settings.features.notifications.title'),
          description: i18n.t('settings.features.notifications.description'),
          enabled: periodicNotificationService.isNotificationEnabled('systemStatus'), // Bir tanesini kontrol et
          icon: 'bulb-outline',
          color: '#F59E0B'
        },
        {
          id: 'suggestions',
          title: i18n.t('settings.features.suggestions.title'),
          description: i18n.t('settings.features.suggestions.description'),
          enabled: true, // Default açık olsun
          icon: 'sparkles-outline',
          color: '#8B5CF6'
        }
      ];

      setSettings(appSettings);
    } catch (error) {
      console.error('Settings loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (settingId: string, newValue: boolean) => {
    try {
      // UI'yi hemen güncelle (optimistic update)
      setSettings(prevSettings =>
        prevSettings.map(setting =>
          setting.id === settingId
            ? { ...setting, enabled: newValue }
            : setting
        )
      );

      // Ayara göre işlem yap
      switch (settingId) {
        case 'notifications':
          await periodicNotificationService.toggleAllNotifications(newValue);
          break;
          
        case 'suggestions':
          // Suggestions toggle logic burada olacak
          // await suggestionService.toggle(newValue);
          break;
      }

    } catch (error) {
      console.error('Toggle error:', error);
      
      // Hata durumunda UI'yi geri al
      setSettings(prevSettings =>
        prevSettings.map(setting =>
          setting.id === settingId
            ? { ...setting, enabled: !newValue }
            : setting
        )
      );
      
      console.error('Toggle error:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{i18n.t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{i18n.t('settings.title')}</Text>
          <Text style={styles.subtitle}>{i18n.t('settings.subtitle')}</Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresList}>
          {settings.map((setting) => (
            <View key={setting.id} style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: `${setting.color}20` }]}>
                <Ionicons name={setting.icon as any} size={24} color={setting.color} />
              </View>
              
              <View style={styles.featureInfo}>
                <Text style={styles.featureTitle}>{setting.title}</Text>
                <Text style={styles.featureDescription}>{setting.description}</Text>
              </View>
              
              <Switch
                value={setting.enabled}
                onValueChange={(value) => handleToggle(setting.id, value)}
                trackColor={{ false: '#E5E7EB', true: `${setting.color}40` }}
                thumbColor={setting.enabled ? setting.color : '#9CA3AF'}
                style={styles.switch}
              />
            </View>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
            <Text style={styles.infoTitle}>{i18n.t('settings.info.title')}</Text>
          </View>
          <Text style={styles.infoText}>{i18n.t('settings.info.description')}</Text>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>BiQuery Mobile v1.0.0</Text>
          <Text style={styles.appBuild}>{i18n.t('settings.app.lastUpdate')}: {new Date().toLocaleDateString()}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  scrollView: {
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
  featuresList: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureInfo: {
    flex: 1,
    marginRight: 16,
  },
  featureTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  switch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  infoSection: {
    backgroundColor: '#EBF4FF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  appInfo: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  appVersion: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  appBuild: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});

export default NotificationSettingsScreen;