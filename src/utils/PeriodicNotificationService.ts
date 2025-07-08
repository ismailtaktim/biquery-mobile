import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  showInfoToast, 
  showSuccessToast, 
  showWarningToast, 
  showErrorToast
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
  
  // Web Dashboard'daki gibi bildirim konfigürasyonları (Web'deki intervals gibi)
  private configs: { [key: string]: NotificationConfig } = {
    // Contextual tips (Web'deki contextualTips gibi)
    contextualTips: { 
      enabled: true, 
      interval: 60000, // 1 dakika (Web'deki 30 saniye mobile için 1 dakika)
      key: 'contextual_tips' 
    },
    
    // Educational tips (Web'deki educationalTips gibi)
    educationalTips: { 
      enabled: true, 
      interval: 120000, // 2 dakika 
      key: 'educational_tips' 
    },
    
    // Performance tips (Web'deki performance feedback gibi)
    performanceTips: { 
      enabled: true, 
      interval: 180000, // 3 dakika
      key: 'performance_tips' 
    },
    
    // System status (Web'deki health check gibi)
    systemStatus: { 
      enabled: true, 
      interval: 240000, // 4 dakika
      key: 'system_status' 
    },
    
    // Activity reminders (Web'deki user engagement gibi)
    activityReminder: { 
      enabled: true, 
      interval: 300000, // 5 dakika
      key: 'activity_reminder' 
    }
  };

  // Web'deki dashboard verilerine benzer user stats
  private userStats = {
    totalQueries: 0,
    lastQueryTime: null as number | null,
    favoriteTerms: [] as string[],
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
    
    // User stats'i yükle
    await this.loadUserStats();
    
    // Periyodik bildirimleri başlat
    this.startPeriodicNotifications();
    
    this.isInitialized = true;
    
    // Web'deki gibi hoş geldin mesajı
    setTimeout(() => {
      showSuccessToast(i18n.t('toast.welcome.mobile'));
    }, 2000);
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
    
    // Son aktiviteden 30+ dakika geçtiyse hoş geldin mesajı (Web'deki session management gibi)
    const lastActivity = await AsyncStorage.getItem('last_activity_time');
    const now = Date.now();
    
    if (lastActivity) {
      const timeDiff = now - parseInt(lastActivity);
      if (timeDiff > 1800000) { // 30 dakika
        showInfoToast(i18n.t('toast.welcome.back'));
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

  private async loadUserStats() {
    try {
      const savedStats = await AsyncStorage.getItem('user_stats');
      if (savedStats) {
        this.userStats = { ...this.userStats, ...JSON.parse(savedStats) };
      }
    } catch (error) {
      console.error('User stats loading error:', error);
    }
  }

  private async saveConfigs() {
    try {
      await AsyncStorage.setItem('notification_configs', JSON.stringify(this.configs));
    } catch (error) {
      console.error('Config saving error:', error);
    }
  }

  private async saveUserStats() {
    try {
      await AsyncStorage.setItem('user_stats', JSON.stringify(this.userStats));
    } catch (error) {
      console.error('User stats saving error:', error);
    }
  }

  private startPeriodicNotifications() {
    if (!this.isAppActive) return;

    console.log('📱 Starting periodic notifications...');

    // Contextual Tips (Web'deki contextual tips sistemi gibi)
    this.scheduleNotification('contextualTips', () => {
      this.showContextualTips();
    });

    // Educational Tips (Web'deki educational tips gibi)
    this.scheduleNotification('educationalTips', () => {
      this.showEducationalTips();
    });

    // Performance Tips (Web'deki performance feedback gibi)
    this.scheduleNotification('performanceTips', () => {
      this.showPerformanceTips();
    });

    // System Status (Web'deki health monitoring gibi)
    this.scheduleNotification('systemStatus', () => {
      this.showSystemStatus();
    });

    // Activity Reminder (Web'deki user engagement gibi)
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

  // Web'deki contextual tips sistemi gibi - bağlamsal ipuçları
  private showContextualTips() {
    const contextualTips = [];
    
    // Saat bazlı ipuçları (Web'deki time-based tips gibi)
    const hour = new Date().getHours();
    if (hour >= 9 && hour < 12) {
      contextualTips.push(i18n.t('contextualTips.morning'));
    } else if (hour >= 12 && hour < 17) {
      contextualTips.push(i18n.t('contextualTips.afternoon'));
    } else if (hour >= 17) {
      contextualTips.push(i18n.t('contextualTips.evening'));
    }
    
    // Sorgu geçmişine göre ipuçları (Web'deki history-based suggestions gibi)
    if (this.userStats.totalQueries > 0) {
      const favoriteTerms = this.userStats.favoriteTerms;
      if (favoriteTerms.includes('acente') || favoriteTerms.includes('agent')) {
        contextualTips.push(i18n.t('historyTips.agent'));
      } else if (favoriteTerms.includes('prim') || favoriteTerms.includes('premium')) {
        contextualTips.push(i18n.t('historyTips.premium'));
      }
    }
    
    // Performans ipuçları (Web'deki dashboard.tips gibi)
    contextualTips.push(i18n.t('dashboard.tips.narrowDateRange'));
    contextualTips.push(i18n.t('dashboard.tips.fewerEntities'));
    contextualTips.push(i18n.t('dashboard.tips.limitResults'));
    contextualTips.push(i18n.t('dashboard.tips.preferTables'));
    
    // Random bir ipucu seç ve göster
    if (contextualTips.length > 0) {
      const randomTip = contextualTips[Math.floor(Math.random() * contextualTips.length)];
      showInfoToast(randomTip);
    }
  }

  // Web'deki educational tips sistemi gibi - öğretici ipuçları
  private showEducationalTips() {
    const educationalTips = [
      i18n.t('tips.maximumMinimum'),
      i18n.t('tips.timeRange'),
      i18n.t('tips.comparison'),
      i18n.t('tips.grouping'),
      i18n.t('dashboard.help.visualizationTip'),
      i18n.t('tips.detailedAnalysis'),
      i18n.t('tips.trendAnalysis'),
      i18n.t('tips.voiceQuery')
    ];
    
    const randomTip = educationalTips[Math.floor(Math.random() * educationalTips.length)];
    showInfoToast(randomTip);
  }

  // Web'deki performance feedback sistemi gibi
  private showPerformanceTips() {
    // Performance tips (Web'deki contextual performance suggestions gibi)
    const performanceTips = [
      i18n.t('toast.performance.tip1'),
      i18n.t('toast.performance.tip2'),
      i18n.t('toast.performance.tip3'),
      i18n.t('toast.performance.tip4')
    ];
    
    const randomTip = performanceTips[Math.floor(Math.random() * performanceTips.length)];
    showInfoToast(randomTip);
  }

  // Web'deki system health monitoring gibi
  private async showSystemStatus() {
    try {
      const startTime = Date.now();
      
      // Basit health check (Web'deki API health monitoring gibi)
      const isHealthy = await this.checkApiHealth();
      
      if (isHealthy) {
        const responseTime = Date.now() - startTime;
        
        if (responseTime < 1000) {
          showSuccessToast(i18n.t('toast.system.healthy', { responseTime: responseTime.toString() }));
        } else {
          showWarningToast(i18n.t('toast.system.slow', { responseTime: responseTime.toString() }));
        }
      } else {
        showErrorToast(i18n.t('toast.system.unhealthy'));
      }
    } catch (error) {
      showErrorToast(i18n.t('toast.api.error'));
    }
  }

  // Web'deki user engagement sistemi gibi
  private showActivityReminder() {
    const reminders = [
      i18n.t('toast.activity.reminder1'),
      i18n.t('toast.activity.reminder2'),
      i18n.t('toast.activity.reminder3'),
      i18n.t('toast.activity.reminder4')
    ];
    
    const randomReminder = reminders[Math.floor(Math.random() * reminders.length)];
    showInfoToast(randomReminder);
  }

  private async checkApiHealth(): Promise<boolean> {
    try {
      // Web'deki health check endpoint'i gibi
      return true; // Mock olarak true döndür
    } catch (error) {
      return false;
    }
  }

  // Web'deki settings management gibi
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
      
      showInfoToast(i18n.t('toast.notifications.settingsUpdated'));
    }
  }

  async toggleAllNotifications(enabled: boolean) {
    const promises = Object.keys(this.configs).map(type => 
      this.toggleNotification(type, enabled)
    );
    
    await Promise.all(promises);
    
    if (enabled) {
      showSuccessToast(i18n.t('toast.notifications.allEnabled'));
    } else {
      showInfoToast(i18n.t('toast.notifications.allDisabled'));
    }
  }

  // Web'deki callback mapping sistemi gibi
  private getCallbackForType(type: string): () => void {
    switch (type) {
      case 'contextualTips':
        return () => this.showContextualTips();
      case 'educationalTips':
        return () => this.showEducationalTips();
      case 'performanceTips':
        return () => this.showPerformanceTips();
      case 'systemStatus':
        return () => this.showSystemStatus();
      case 'activityReminder':
        return () => this.showActivityReminder();
      default:
        return () => {};
    }
  }

  // Web'deki user stats tracking gibi
  updateQueryStats(resultCount: number, queryText?: string) {
    this.userStats.totalQueries += 1;
    this.userStats.lastActivityTime = Date.now();
    this.userStats.lastQueryTime = Date.now();
    
    // Query analizi (Web'deki favorite terms tracking gibi)
    if (queryText) {
      const words = queryText.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 3 && !this.userStats.favoriteTerms.includes(word)) {
          this.userStats.favoriteTerms.push(word);
        }
      });
      
      // En fazla 20 terimi sakla
      if (this.userStats.favoriteTerms.length > 20) {
        this.userStats.favoriteTerms = this.userStats.favoriteTerms.slice(-20);
      }
    }
    
    this.saveUserStats();
    console.log('📱 Query stats updated:', { resultCount, totalQueries: this.userStats.totalQueries });
  }

  updateLanguage(language: string) {
    console.log('📱 Updating notification service language:', language);
    // Web'deki dil değişikliği handling'i gibi
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
      userStats: this.userStats
    };
  }
}

// Singleton instance
export const periodicNotificationService = new PeriodicNotificationService();