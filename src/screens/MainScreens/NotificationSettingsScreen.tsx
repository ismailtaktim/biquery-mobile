import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { periodicNotificationService } from '../../utils/PeriodicNotificationService';
import { showSuccessToast, showInfoToast } from '../../utils/toastUtils';
import { i18n } from '../../utils/i18n';

interface NotificationSetting {
  id: string;
  name: string;
  enabled: boolean;
  interval: number;
}

const NotificationSettingsScreen = ({ navigation }: any) => {
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const notificationSettings = periodicNotificationService.getNotificationSettings();
      setSettings(notificationSettings);
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

      // Service'i güncelle
      await periodicNotificationService.toggleNotification(settingId, newValue);
      
      // Başarı mesajı
      const actionText = newValue ? 'açıldı ✅' : 'kapatıldı ❌';
      const typeName = i18n.t(`settings.notifications.types.${settingId}`);
      showSuccessToast(`${typeName} bildirimleri ${actionText}`);

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
      
      showInfoToast('Ayar değiştirilemedi, tekrar deneyin');
    }
  };

  const handleToggleAll = () => {
    const allEnabled = settings.every(setting => setting.enabled);
    const newState = !allEnabled;

    Alert.alert(
      i18n.t('settings.notifications.confirmTitle'),
      newState 
        ? i18n.t('settings.notifications.enableAllConfirm')
        : i18n.t('settings.notifications.disableAllConfirm'),
      [
        {
          text: i18n.t('common.cancel'),
          style: 'cancel',
        },
        {
          text: i18n.t('common.confirm'),
          onPress: async () => {
            try {
              // UI'yi hemen güncelle
              setSettings(prevSettings =>
                prevSettings.map(setting => ({ ...setting, enabled: newState }))
              );

              // Service'i güncelle
              await periodicNotificationService.toggleAllNotifications(newState);

            } catch (error) {
              console.error('Toggle all error:', error);
              // Hata durumunda ayarları yeniden yükle
              loadSettings();
            }
          },
        },
      ]
    );
  };

  const formatInterval = (interval: number): string => {
    const seconds = interval / 1000;
    const minutes = seconds / 60;

    if (seconds < 60) {
      return i18n.t('settings.notifications.interval.seconds', { count: seconds });
    } else {
      return i18n.t('settings.notifications.interval.minutes', { count: minutes });
    }
  };

  const getNotificationDescription = (settingId: string): string => {
    return i18n.t(`settings.notifications.descriptions.${settingId}`);
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
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{i18n.t('settings.notifications.title')}</Text>
          <Text style={styles.subtitle}>{i18n.t('settings.notifications.subtitle')}</Text>
        </View>

        {/* Toggle All Button */}
        <TouchableOpacity style={styles.toggleAllButton} onPress={handleToggleAll}>
          <Text style={styles.toggleAllText}>
            {settings.every(s => s.enabled) 
              ? i18n.t('settings.notifications.disableAll')
              : i18n.t('settings.notifications.enableAll')
            }
          </Text>
        </TouchableOpacity>

        {/* Notification Settings List */}
        <View style={styles.settingsList}>
          {settings.map((setting) => (
            <View key={setting.id} style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingName}>
                  {i18n.t(`settings.notifications.types.${setting.id}`)}
                </Text>
                <Text style={styles.settingDescription}>
                  {getNotificationDescription(setting.id)}
                </Text>
                <Text style={styles.settingInterval}>
                  {i18n.t('settings.notifications.interval.label')}: {formatInterval(setting.interval)}
                </Text>
              </View>
              <Switch
                value={setting.enabled}
                onValueChange={(value) => handleToggle(setting.id, value)}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={setting.enabled ? '#f5dd4b' : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>{i18n.t('settings.notifications.info.title')}</Text>
          <Text style={styles.infoText}>{i18n.t('settings.notifications.info.description')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  toggleAllButton: {
    margin: 20,
    padding: 15,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsList: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
  settingInterval: {
    fontSize: 12,
    color: '#999',
  },
  infoSection: {
    margin: 20,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default NotificationSettingsScreen;