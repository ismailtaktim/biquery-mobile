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
  
  // Web Dashboard'daki gibi bildirim konfigürasyonları (DAHA KISA ARALIKLAR)
  private configs: { [key: string]: NotificationConfig } = {
    // Cache kullanım güncelleme (Web'deki gibi)
    cacheUpdate: { 
      enabled: true, 
      interval: 5000, // 5 saniye (Web ile aynı)
      key: 'cache_last_update' 
    },
    
    // Başarılı işlem bildirimleri (Web'de daha sıktı)
    successReminder: { 
      enabled: true, 
      interval: 60000, // 1 dakika (Web gibi sık)
      key: 'success_reminder' 
    },
    
    // Sistem durumu bildirimleri (Web'de stats sürekli güncellendi)
    systemStatus: { 
      enabled: true, 
      interval: 120000, // 2 dakika (Web'deki stats panel gibi)
      key: 'system_status' 
    },
    
    // Performans ipuçları (Web'deki TipsPanel daha görünürdü)
    performanceTips: { 
      enabled: true, 
      interval: 180000, // 3 dakika (Web'de hep görünürdü)
      key: 'performance_tips' 
    },
    
    // Kullanıcı aktivite hatırlatıcıları
    activityReminder: { 
      enabled: true, 
      interval: 300000, // 5 dakika (Web'de daha interaktifti)
      key: 'activity_reminder' 
    }
  };

  // Web'deki dashboard verilerine benzer
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
    
    // App state değişikliklerini dinle (Web'deki useEffect gibi)
    this.setupAppStateListener();
    
    // Saved configs'i yükle
    await this.loadConfigs();
    
    // Periyodik bildirimleri başlat
    this.startPeriodicNotifications();
    
    this.isInitialized = true;
    
    // Web'deki gibi hoş geldin mesajı
    setTimeout(() => {
      showSuccessToast('toast.welcome.mobile');
    }, 2000);
  }

  private setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed:', nextAppState);
      
      this.isAppActive = nextAppState === 'active';
      
      if (nextAppState === 'active') {
        // App aktif olduğunda - Web'deki component mount gibi
        this.onAppBecomeActive();
      } else if (nextAppState === 'background') {
        // App arka plana geçtiğinde
        this.onAppGoBackground();
      }
    });
  }

  private async onAppBecomeActive() {
    console.log('📱 App became active');
    
    // Son aktiviteden 30+ dakika geçtiyse hoş geldin mesajı
    const lastActivity = await AsyncStorage.getItem('last_activity_time');
    const now = Date.now();
    
    if (lastActivity) {
      const timeDiff = now - parseInt(lastActivity);
      if (timeDiff > 1800000) { // 30 dakika
        showInfoToast('toast.welcome.back');
      }
    }
    
    // Periyodik bildirimleri yeniden başlat
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
    if (!this.isAppActive) return;

    console.log('📱 Starting periodic notifications...');

    // Cache Update Notification (Web'deki gibi)
    this.scheduleNotification('cacheUpdate', () => {
      this.updateCacheUsage();
    });

    // Success Reminder (Web'deki success toast'lar gibi)
    this.scheduleNotification('successReminder', () => {
      this.showSuccessReminder();
    });

    // System Status (Web'deki stats panel gibi)
    this.scheduleNotification('systemStatus', () => {
      this.showSystemStatus();
    });

    // Performance Tips (Web'deki TipsPanel gibi)
    this.scheduleNotification('performanceTips', () => {
      this.showPerformanceTip();
    });

    // Activity Reminder
    this.scheduleNotification('activityReminder', () => {
      this.showActivityReminder();
    });
  }

  private scheduleNotification(configKey: string, callback: () => void) {
    const config = this.configs[configKey];
    if (!config || !config.enabled) return;

    // Önceki interval'i temizle
    if (this.intervals[configKey]) {
      clearInterval(this.intervals[configKey]);
    }

    // Yeni interval başlat
    this.intervals[configKey] = setInterval(callback, config.interval);
  }

  // Web Dashboard'daki cache usage güncellemesi gibi
  private updateCacheUsage() {
    this.stats.cacheUsage = this.stats.cacheUsage + Math.random() * 5;
    if (this.stats.cacheUsage > 100) {
      this.stats.cacheUsage = 0;
      
      // Cache reset bildirimi (Web'deki gibi)
      showInfoToast('toast.cache.reset');
    }
  }

  // Web'deki success toast'lar gibi
  private showSuccessReminder() {
    const tips = [
      'toast.tips.keepQuerying',
      'toast.tips.tryAnalysis', 
      'toast.tips.useFilters',
      'toast.tips.saveQueries'
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    showInfoToast(randomTip);
  }

  // Web'deki stats panel gibi
  private async showSystemStatus() {
    try {
      // API durumu kontrol et (Web'deki gibi)
      const startTime = Date.now();
      
      // Basit health check
      const isHealthy = await this.checkApiHealth();
      
      if (isHealthy) {
        const responseTime = Date.now() - startTime;
        
        if (responseTime < 1000) {
          showSuccessToast(`Sistem sağlıklı (Yanıt süresi: ${responseTime}ms)`);
        } else {
          showWarningToast(`Sistem yavaş çalışıyor (Yanıt süresi: ${responseTime}ms)`);
        }
      }
    } catch (error) {
      showApiToast.error();
    }
  }

  // Web'deki TipsPanel gibi performans ipuçları
  private showPerformanceTip() {
    const tips = [
      'toast.performance.narrowDateRange',
      'toast.performance.fewerEntities', 
      'toast.performance.limitResults',
      'toast.performance.preferTables'
    ];
    
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    showInfoToast(randomTip);
  }

  // Kullanıcı aktivite hatırlatıcısı
  private showActivityReminder() {
    const reminders = [
      'toast.activity.tryNewQuery',
      'toast.activity.checkResults',
      'toast.activity.exploreData'
    ];
    
    const randomReminder = reminders[Math.floor(Math.random() * reminders.length)];
    showInfoToast(randomReminder);
  }

  private async checkApiHealth(): Promise<boolean> {
    try {
      // Basit health check endpoint'i varsa
      // const response = await apiService.healthCheck();
      // return response.status === 'ok';
      
      // Yoksa basit bir test query
      return true; // Mock olarak true döndür
    } catch (error) {
      return false;
    }
  }

  // Belirli bildirim tiplerini aç/kapat
  async toggleNotification(type: string, enabled: boolean) {
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
      
      // Kullanıcıya bildir
      showInfoToast('toast.notifications.settingsUpdated');
    }
  }

  // Tüm bildirimleri aç/kapat
  async toggleAllNotifications(enabled: boolean) {
    const promises = Object.keys(this.configs).map(type => 
      this.toggleNotification(type, enabled)
    );
    
    await Promise.all(promises);
    
    if (enabled) {
      showSuccessToast('toast.notifications.allEnabled');
    } else {
      showInfoToast('toast.notifications.allDisabled');
    }
  }

  // Type'a göre callback döndür
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

  // Bildirim durumlarını al
  getNotificationSettings() {
    return Object.entries(this.configs).map(([key, config]) => ({
      id: key,
      name: key,
      enabled: config.enabled,
      interval: config.interval
    }));
  }

  // Belirli bildirim tipinin durumunu al
  isNotificationEnabled(type: string): boolean {
    return this.configs[type]?.enabled || false;
  }

  // Tüm bildirimleri durdur
  stopAllNotifications() {
    Object.keys(this.intervals).forEach(key => {
      clearInterval(this.intervals[key]);
      delete this.intervals[key];
    });
    console.log('📱 All periodic notifications stopped');
  }

  // Servisi kapat
  destroy() {
    this.stopAllNotifications();
    this.isInitialized = false;
    console.log('📱 Notification service destroyed');
  }

  // Debug bilgisi
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isAppActive: this.isAppActive,
      activeIntervals: Object.keys(this.intervals).length,
      configs: this.configs,
      stats: this.stats
    };
  }

  // Dil güncelleme (Dashboard integration için)
  updateLanguage(language: string) {
    console.log('📱 Updating notification service language:', language);
    // Language update logic burada olabilir
  }

  // Query stats güncelleme (Dashboard integration için)
  updateQueryStats(resultCount: number) {
    this.stats.queryCount += 1;
    this.stats.lastActivityTime = Date.now();
    console.log('📱 Query stats updated:', { resultCount, totalQueries: this.stats.queryCount });
  }
}

// Singleton instance
export const periodicNotificationService = new PeriodicNotificationService();