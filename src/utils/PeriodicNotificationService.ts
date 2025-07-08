import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  showInfoToast, 
  showSuccessToast, 
  showWarningToast, 
  showApiToast,
  showNetworkToast 
} from './toastUtils';
import { i18n } from './i18n';
import apiService from '../services/apiService';

interface NotificationConfig {
  enabled: boolean;
  interval: number; // milliseconds
  lastShown?: number;
  key: string;
}

class PeriodicNotificationService {
  private intervals: { [key: string]: NodeJS.Timeout } = {};
  private isAppActive = true;
  private isInitialized = false;
  
  // Default konfigürasyonlar (başlangıçta enabled: true)
  private configs: { [key: string]: NotificationConfig } = {
    // Cache kullanım güncelleme
    cacheUpdate: { 
      enabled: true, // Başlangıçta açık
      interval: 5000, // 5 saniye
      key: 'cache_last_update' 
    },
    
    // Başarılı işlem bildirimleri
    successReminder: { 
      enabled: true, // Başlangıçta açık
      interval: 60000, // 1 dakika
      key: 'success_reminder' 
    },
    
    // Sistem durumu bildirimleri
    systemStatus: { 
      enabled: true, // Başlangıçta açık
      interval: 120000, // 2 dakika
      key: 'system_status' 
    },
    
    // Performans ipuçları
    performanceTips: { 
      enabled: true, // Başlangıçta açık
      interval: 180000, // 3 dakika
      key: 'performance_tips' 
    },
    
    // Kullanıcı aktivite hatırlatıcıları
    activityReminder: { 
      enabled: true, // Başlangıçta açık
      interval: 300000, // 5 dakika
      key: 'activity_reminder' 
    }
  };

  private stats = {
    cacheUsage: 0,
    lastQueryTime: 0,
    queryCount: 0,
    lastActivityTime: Date.now()
  };

  async init() {
    if (this.isInitialized) {
      console.log('📱 Notification service already initialized');
      return;
    }

    console.log('📱 Initializing periodic notification service...');
    
    // App state değişikliklerini dinle
    this.setupAppStateListener();
    
    // Saved configs'i yükle (önemli: bu önce olmalı)
    await this.loadConfigs();
    
    // NotificationSettingsScreen ayarlarını kontrol et
    await this.loadNotificationSettings();
    
    // Sadece açık olan bildirimleri başlat
    this.startPeriodicNotifications();
    
    this.isInitialized = true;
    console.log('📱 Notification service initialized successfully');
  }

  // NotificationSettingsScreen'den gelen ayarları yükle
  private async loadNotificationSettings() {
    try {
      const notificationSettings = await AsyncStorage.getItem('notification_settings');
      if (notificationSettings) {
        const settings = JSON.parse(notificationSettings);
        
        console.log('📱 Loading notification settings:', settings);
        
        // NotificationSettingsScreen'deki toggle durumlarını al
        if (settings.notifications !== undefined) {
          // İpuçları (notifications toggle'ı)
          const notificationsEnabled = settings.notifications;
          this.configs.performanceTips.enabled = notificationsEnabled;
          this.configs.systemStatus.enabled = notificationsEnabled;
          this.configs.cacheUpdate.enabled = notificationsEnabled;
        }
        
        if (settings.suggestions !== undefined) {
          // Öneriler (suggestions toggle'ı)
          const suggestionsEnabled = settings.suggestions;
          this.configs.successReminder.enabled = suggestionsEnabled;
          this.configs.activityReminder.enabled = suggestionsEnabled;
        }
        
        console.log('📱 Updated configs based on settings:', this.configs);
      } else {
        console.log('📱 No notification settings found, keeping defaults (notifications: ON, suggestions: ON)');
        // İlk kez açılıyorsa default olarak hepsi açık (zaten configs'te enabled: true)
        // Ayarları kaydet
        const defaultSettings = {
          notifications: true,  // İpuçları AÇIK
          suggestions: true     // Öneriler AÇIK
        };
        
        await AsyncStorage.setItem('notification_settings', JSON.stringify(defaultSettings));
        console.log('📱 Created default settings (all enabled):', defaultSettings);
      }
    } catch (error) {
      console.error('📱 Error loading notification settings:', error);
    }
  }

  // Herhangi bir bildirim açık mı kontrol et
  private hasAnyEnabledNotifications(): boolean {
    return Object.values(this.configs).some(config => config.enabled);
  }

  private setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed:', nextAppState);
      
      this.isAppActive = nextAppState === 'active';
      
      if (nextAppState === 'active') {
        this.onAppBecomeActive();
      } else if (nextAppState === 'background') {
        this.onAppGoBackground();
      }
    });
  }

  private async onAppBecomeActive() {
    console.log('📱 App became active');
    
    // Ayarları yeniden yükle (kullanıcı ayarları değiştirmiş olabilir)
    await this.loadNotificationSettings();
    
    // Son aktiviteden 30+ dakika geçtiyse hoş geldin mesajı
    const lastActivity = await AsyncStorage.getItem('last_activity_time');
    const now = Date.now();
    
    if (lastActivity) {
      const timeDiff = now - parseInt(lastActivity);
      if (timeDiff > 1800000 && this.hasAnyEnabledNotifications()) { // 30 dakika
        showInfoToast(i18n.t('toast.welcome.back'));
      }
    }
    
    // Periyodik bildirimleri yeniden başlat (sadece açık olanları)
    this.startPeriodicNotifications();
    
    // Activity time'ı güncelle
    await AsyncStorage.setItem('last_activity_time', now.toString());
  }

  private onAppGoBackground() {
    console.log('📱 App went to background');
    
    // Tüm interval'leri durdur (battery optimization)
    this.stopAllNotifications();
  }

  private async loadConfigs() {
    try {
      const savedConfigs = await AsyncStorage.getItem('notification_configs');
      if (savedConfigs) {
        const parsed = JSON.parse(savedConfigs);
        this.configs = { ...this.configs, ...parsed };
        console.log('📱 Loaded saved configs:', this.configs);
      }
    } catch (error) {
      console.error('Config loading error:', error);
    }
  }

  private async saveConfigs() {
    try {
      await AsyncStorage.setItem('notification_configs', JSON.stringify(this.configs));
    } catch (error) {
      console.error('Config saving error:', error);
    }
  }

  private startPeriodicNotifications() {
    if (!this.isAppActive) {
      console.log('📱 App not active, skipping notifications');
      return;
    }

    // İpuçları (notifications) kapalıysa TÜM periyodik bildirimleri durdur
    const notificationsEnabled = this.configs.performanceTips.enabled || this.configs.systemStatus.enabled || this.configs.cacheUpdate.enabled;
    
    if (!notificationsEnabled) {
      console.log('📱 İpuçları disabled, stopping ALL periodic notifications (including suggestions)');
      return;
    }

    // Sadece açık olan bildirimleri say
    const enabledNotifications = Object.entries(this.configs)
      .filter(([_, config]) => config.enabled)
      .map(([key, _]) => key);

    console.log('📱 Starting periodic notifications for:', enabledNotifications);

    // Sadece açık olan bildirimleri başlat
    this.scheduleNotification('cacheUpdate', () => {
      this.updateCacheUsage();
    });

    this.scheduleNotification('successReminder', () => {
      this.showSuccessReminder();
    });

    this.scheduleNotification('systemStatus', () => {
      this.showSystemStatus();
    });

    this.scheduleNotification('performanceTips', () => {
      this.showPerformanceTip();
    });

    this.scheduleNotification('activityReminder', () => {
      this.showActivityReminder();
    });
  }

  private scheduleNotification(configKey: string, callback: () => void) {
    const config = this.configs[configKey];
    if (!config || !config.enabled) {
      console.log(`📱 Skipping ${configKey} notification (disabled)`);
      return;
    }

    console.log(`📱 Scheduling ${configKey} notification every ${config.interval}ms`);

    // Önceki interval'i temizle
    if (this.intervals[configKey]) {
      clearInterval(this.intervals[configKey]);
    }

    // Yeni interval başlat
    this.intervals[configKey] = setInterval(callback, config.interval);
  }

  private updateCacheUsage() {
    // Sadece enabled ise çalıştır
    if (!this.configs.cacheUpdate.enabled) {
      console.log('📱 Cache update disabled, skipping');
      return;
    }
    
    this.stats.cacheUsage = this.stats.cacheUsage + Math.random() * 5;
    if (this.stats.cacheUsage > 100) {
      this.stats.cacheUsage = 0;
      showInfoToast(i18n.t('toast.cache.reset'));
    }
  }

  private showSuccessReminder() {
    // Sadece enabled ise çalıştır
    if (!this.configs.successReminder.enabled) {
      console.log('📱 Success reminder disabled, skipping');
      return;
    }
    
    const tips = [
      'toast.success.reminder1',
      'toast.success.reminder2', 
      'toast.success.reminder3',
      'toast.success.reminder4'
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    showInfoToast(i18n.t(randomTip));
  }

  private async showSystemStatus() {
    // Sadece enabled ise çalıştır
    if (!this.configs.systemStatus.enabled) {
      console.log('📱 System status disabled, skipping');
      return;
    }
    
    try {
      const startTime = Date.now();
      const isHealthy = await this.checkApiHealth();
      
      if (isHealthy) {
        const responseTime = Date.now() - startTime;
        
        if (responseTime < 1000) {
          showSuccessToast(i18n.t('toast.system.healthy', { responseTime: responseTime.toString() }));
        } else {
          showWarningToast(i18n.t('toast.system.slow', { responseTime: responseTime.toString() }));
        }
      } else {
        showWarningToast(i18n.t('toast.system.unhealthy'));
      }
    } catch (error) {
      showWarningToast(i18n.t('toast.system.unhealthy'));
    }
  }

  private showPerformanceTip() {
    // Sadece enabled ise çalıştır
    if (!this.configs.performanceTips.enabled) {
      console.log('📱 Performance tips disabled, skipping');
      return;
    }
    
    const tips = [
      'toast.performance.tip1',
      'toast.performance.tip2', 
      'toast.performance.tip3',
      'toast.performance.tip4'
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    showInfoToast(i18n.t(randomTip));
  }

  private showActivityReminder() {
    // Sadece enabled ise çalıştır
    if (!this.configs.activityReminder.enabled) {
      console.log('📱 Activity reminder disabled, skipping');
      return;
    }
    
    const reminders = [
      'toast.activity.reminder1',
      'toast.activity.reminder2',
      'toast.activity.reminder3'
    ];
    
    const randomReminder = reminders[Math.floor(Math.random() * reminders.length)];
    showInfoToast(i18n.t(randomReminder));
  }

  private async checkApiHealth(): Promise<boolean> {
    try {
      // Mock health check
      return true;
    } catch (error) {
      return false;
    }
  }

  // NotificationSettingsScreen'den çağrılacak
  async toggleNotification(type: string, enabled: boolean) {
    console.log(`📱 Toggle notification ${type}: ${enabled}`);
    
    if (this.configs[type]) {
      this.configs[type].enabled = enabled;
      await this.saveConfigs();
      
      if (enabled) {
        console.log(`📱 Enabling notification: ${type}`);
        this.scheduleNotification(type, this.getCallbackForType(type));
      } else {
        console.log(`📱 Disabling notification: ${type}`);
        if (this.intervals[type]) {
          clearInterval(this.intervals[type]);
          delete this.intervals[type];
        }
      }
    }
  }

  // NotificationSettingsScreen'deki "İpuçları" toggle'ı
  async toggleAllNotifications(enabled: boolean) {
    console.log(`📱 toggleAllNotifications called with: ${enabled}`);
    
    // İpuçları kategorisindeki tüm bildirimleri aç/kapat
    this.configs.performanceTips.enabled = enabled;
    this.configs.systemStatus.enabled = enabled;
    this.configs.cacheUpdate.enabled = enabled;
    
    console.log('📱 Updated notification configs:', {
      performanceTips: this.configs.performanceTips.enabled,
      systemStatus: this.configs.systemStatus.enabled,
      cacheUpdate: this.configs.cacheUpdate.enabled
    });
    
    // AsyncStorage'a kaydet (NotificationSettingsScreen ile senkron)
    const currentSettings = await AsyncStorage.getItem('notification_settings');
    const settings = currentSettings ? JSON.parse(currentSettings) : {};
    
    settings.notifications = enabled;
    
    await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
    console.log('📱 Saved notification settings to AsyncStorage:', settings);
    
    // Ayarları yeniden yükle ve servisi güncelle
    await this.reloadAndRestartService();
  }

  // NotificationSettingsScreen'deki "Öneriler" toggle'ı
  async toggleSuggestions(enabled: boolean) {
    console.log(`📱 toggleSuggestions called with: ${enabled}`);
    
    // Öneriler kategorisindeki tüm bildirimleri aç/kapat
    this.configs.successReminder.enabled = enabled;
    this.configs.activityReminder.enabled = enabled;
    
    console.log('📱 Updated suggestion configs:', {
      successReminder: this.configs.successReminder.enabled,
      activityReminder: this.configs.activityReminder.enabled
    });
    
    // AsyncStorage'a kaydet (NotificationSettingsScreen ile senkron)
    const currentSettings = await AsyncStorage.getItem('notification_settings');
    const settings = currentSettings ? JSON.parse(currentSettings) : {};
    
    settings.suggestions = enabled;
    
    await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
    console.log('📱 Saved suggestion settings to AsyncStorage:', settings);
    
    // Ayarları yeniden yükle ve servisi güncelle
    await this.reloadAndRestartService();
  }

  // Ayarları yeniden yükle ve servisi güncelle
  private async reloadAndRestartService() {
    console.log('📱 Reloading service with new settings...');
    
    // Tüm interval'leri durdur
    this.stopAllNotifications();
    
    // Ayarları yeniden yükle
    await this.loadNotificationSettings();
    
    // Servisi yeniden başlat (sadece açık olanlarla)
    this.startPeriodicNotifications();
  }

  private getCallbackForType(type: string): () => void {
    switch (type) {
      case 'cacheUpdate':
        return () => this.updateCacheUsage();
      case 'successReminder':
        return () => this.showSuccessReminder();
      case 'systemStatus':
        return () => this.showSystemStatus();
      case 'performanceTips':
        return () => this.showPerformanceTip();
      case 'activityReminder':
        return () => this.showActivityReminder();
      default:
        return () => {};
    }
  }

  getNotificationSettings() {
    return Object.entries(this.configs).map(([key, config]) => ({
      id: key,
      name: key,
      enabled: config.enabled,
      interval: config.interval
    }));
  }

  isNotificationEnabled(type: string): boolean {
    return this.configs[type]?.enabled || false;
  }

  // İpuçları grubu açık mı?
  isNotificationsEnabled(): boolean {
    return this.configs.performanceTips.enabled || this.configs.systemStatus.enabled || this.configs.cacheUpdate.enabled;
  }

  // Öneriler grubu açık mı?
  isSuggestionsEnabled(): boolean {
    return this.configs.successReminder.enabled || this.configs.activityReminder.enabled;
  }

  stopAllNotifications() {
    Object.keys(this.intervals).forEach(key => {
      clearInterval(this.intervals[key]);
      delete this.intervals[key];
    });
    console.log('📱 All periodic notifications stopped');
  }

  destroy() {
    this.stopAllNotifications();
    this.isInitialized = false;
    console.log('📱 Notification service destroyed');
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isAppActive: this.isAppActive,
      activeIntervals: Object.keys(this.intervals).length,
      configs: this.configs,
      stats: this.stats,
      hasEnabledNotifications: this.hasAnyEnabledNotifications()
    };
  }

  updateLanguage(language: string) {
    console.log('📱 Updating notification service language:', language);
  }

  updateQueryStats(resultCount: number) {
    this.stats.queryCount += 1;
    this.stats.lastActivityTime = Date.now();
    console.log('📱 Query stats updated:', { resultCount, totalQueries: this.stats.queryCount });
  }
}

export const periodicNotificationService = new PeriodicNotificationService();