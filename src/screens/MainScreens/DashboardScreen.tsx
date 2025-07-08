import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  AppState,
  AppStateStatus,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EnhancedQueryInput from '../../components/query/EnhancedQueryInput';
import QueryResults from '../../components/query/QueryResults';
import AnalysisResultModal from '../../components/analytics/AnalysisResultModal';
import LanguageButton from '../../components/common/LanguageButton';
import { useLanguage } from '../../context/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import { periodicNotificationService } from '../../utils/PeriodicNotificationService';
import { showSuccessToast } from '../../utils/toastUtils';

interface QueryData {
  query: string;
  results: any;
}

const DashboardScreen: React.FC = () => {
  const { t, currentLanguage } = useLanguage();
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [currentQuery, setCurrentQuery] = useState<QueryData | null>(null);
  const [showQueryInput, setShowQueryInput] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Analysis states
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [currentAnalysisJobId, setCurrentAnalysisJobId] = useState<string | null>(null);
  const [currentAnalysisType, setCurrentAnalysisType] = useState<'general' | 'anomaly' | 'forecast' | 'trends'>('general');
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);

  console.log('🔥 DashboardScreen rendering...', {
    hasQuery: !!currentQuery,
    showQueryInput,
    language: currentLanguage
  });

  // PeriodicNotificationService'i Dashboard'da başlat (sadece ayarlar açıksa)
  useEffect(() => {
    console.log('📱 Dashboard mounted, checking notification settings...');
    
    const initNotificationService = async () => {
      // Önce ayarları kontrol et
      try {
        const savedSettings = await AsyncStorage.getItem('notification_settings');
        let shouldStartService = false;
        
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          shouldStartService = settings.notifications || settings.suggestions;
          console.log('📱 Settings found:', settings, 'Should start service:', shouldStartService);
        } else {
          // İlk kez açılıyorsa default olarak açık
          shouldStartService = true;
          console.log('📱 No settings found, starting with defaults');
        }
        
        if (shouldStartService) {
          console.log('📱 Starting notification service...');
          // Welcome toast göster
          showSuccessToast(t('toast.welcome.mobile'));
          
          // Notification service'i başlat
          await periodicNotificationService.init();
          periodicNotificationService.updateLanguage(currentLanguage);
        } else {
          console.log('📱 All notifications disabled, not starting service');
        }
      } catch (error) {
        console.error('📱 Error checking notification settings:', error);
      }
    };
    
    initNotificationService();
    
    // App state değişikliklerini dinle
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        periodicNotificationService.updateLanguage(currentLanguage);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      console.log('📱 Dashboard unmounting, cleaning up notification service...');
      subscription?.remove();
      periodicNotificationService.destroy();
    };
  }, []);

  // Dil değişikliklerini dinle
  useEffect(() => {
    periodicNotificationService.updateLanguage(currentLanguage);
  }, [currentLanguage]);

  // Profile menu'yu kapatmak için
  useEffect(() => {
    const closeProfileMenu = () => setShowProfileMenu(false);
    // Touch outside to close menu logic buraya eklenebilir
    return () => {};
  }, []);

  const handleQuerySubmit = (query: string, results: any) => {
    console.log('📊 Dashboard - Query results received:', {
      query,
      dataLength: results.data?.length,
      columns: results.columns?.length
    });

    setCurrentQuery({
      query,
      results
    });
    setShowQueryInput(false);

    // Notification service'e query istatistiklerini güncelle
    periodicNotificationService.updateQueryStats(results.data?.length || 0);
  };

  const handleQueryError = (error: string) => {
    console.error('❌ Dashboard - Query error:', error);
    Alert.alert(t('common.error'), error);
  };

  const handleNewQuery = () => {
    console.log('🔄 Dashboard - New query requested');
    setCurrentQuery(null);
    setShowQueryInput(false);
  };

  const openQueryInput = () => {
    console.log('📝 Dashboard - Opening query input');
    setShowQueryInput(true);
  };

  const openNotificationSettings = () => {
    console.log('🔔 Opening notification settings');
    navigation.navigate('NotificationSettings' as never);
  };

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'), // "Çıkış Yap" / "Logout" / "Abmelden" / "Cerrar Sesión"
      t('auth.logoutConfirm'), // "Çıkış yapmak istediğinizden emin misiniz?"
      [
        {
          text: t('common.cancel'), // "İptal" / "Cancel" / "Abbrechen" / "Cancelar"
          style: 'cancel',
        },
        {
          text: t('auth.logout'), // "Çıkış Yap"
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 User confirmed logout');
              await logout();
              console.log('✅ Logout completed');
            } catch (error) {
              console.error('❌ Logout error:', error);
              Alert.alert(
                t('common.error'),
                t('auth.logoutError') // "Çıkış yapılırken hata oluştu"
              );
            }
          },
        },
      ]
    );
  };

  // Analysis functions with language support
  const startQuickAnalysis = async (analysisType: 'general' | 'anomaly' | 'forecast' | 'trends', sampleQuery: string) => {
    if (isStartingAnalysis) return;

    setIsStartingAnalysis(true);

    try {
      // Dil bazlı örnek sorgular
      const localizedSampleQueries = {
        tr: {
          general: '2024 yılında en çok prim üreten 10 acente',
          trends: 'Son 12 ayda aylık prim üretimi trendi',
          anomaly: 'Acentelerin hasar oranları ve prim üretimleri',
          forecast: 'Gelecek 6 ay prim üretimi tahmini'
        },
        en: {
          general: 'Top 10 agents with highest premium in 2024',
          trends: 'Monthly premium production trend in last 12 months',
          anomaly: 'Agent loss ratios and premium productions',
          forecast: 'Next 6 months premium production forecast'
        },
        de: {
          general: 'Top 10 Agenturen mit höchster Prämie in 2024',
          trends: 'Monatlicher Prämienproduktionstrend in den letzten 12 Monaten',
          anomaly: 'Agenten-Schadenquoten und Prämienproduktionen',
          forecast: 'Prämienproduktionsprognose für die nächsten 6 Monate'
        },
        es: {
          general: 'Top 10 agentes con mayor prima en 2024',
          trends: 'Tendencia de producción mensual de primas en los últimos 12 meses',
          anomaly: 'Ratios de siniestralidad de agentes y producciones de primas',
          forecast: 'Pronóstico de producción de primas para los próximos 6 meses'
        }
      };

      const currentLangQueries = localizedSampleQueries[currentLanguage as keyof typeof localizedSampleQueries] || localizedSampleQueries.tr;
      const queryToUse = currentLangQueries[analysisType];
      
      // Önce veri sorgusu çalıştır
      const queryResults = await apiService.executeQuery(queryToUse, currentLanguage);
      
      if (!queryResults.data || queryResults.data.length < 5) {
        Alert.alert(
          t('analysis.insufficientData'),
          t('analysis.minDataRequired')
        );
        setIsStartingAnalysis(false);
        return;
      }

      // Analizi başlat (dil parametresi ile)
      const response = await apiService.startAnalysis(queryResults.data, analysisType, currentLanguage);
      
      if (response.job_id) {
        setCurrentAnalysisJobId(response.job_id);
        setCurrentAnalysisType(analysisType);
        setAnalysisModalVisible(true);
        
        console.log('✅ Quick analysis started:', response.job_id);
      } else {
        Alert.alert(t('common.error'), t('analysis.startError'));
      }
    } catch (error: any) {
      console.error('❌ Quick analysis error:', error);
      Alert.alert(
        t('analysis.error'),
        error.message || t('analysis.generalError')
      );
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  const handleAnalysisComplete = () => {
    console.log('📊 Quick analysis completed');
  };

  const handleAnalysisModalClose = () => {
    setAnalysisModalVisible(false);
    setCurrentAnalysisJobId(null);
  };

  // Eğer query sonucu varsa, sonuçları göster
  if (currentQuery) {
    return (
      <QueryResults
        query={currentQuery.query}
        data={currentQuery.results.data || []}
        columns={currentQuery.results.columns || []}
        sql={currentQuery.results.sql}
        executionTime={currentQuery.results.execution_time}
        onNewQuery={handleNewQuery}
      />
    );
  }

  // Eğer query input açıksa, EnhancedQueryInput'u göster
  if (showQueryInput) {
    return (
      <View style={styles.container}>
        {/* Header with back button */}
        <View style={styles.queryHeader}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setShowQueryInput(false)}
          >
            <Ionicons name="arrow-back" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <Text style={styles.queryHeaderTitle}>{t('queryInput.title')}</Text>
          <LanguageButton />
        </View>

        <EnhancedQueryInput 
          onQuerySubmit={handleQuerySubmit}
          onError={handleQueryError}
        />
      </View>
    );
  }

  // Normal Dashboard görünümü
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>BiQuery</Text>
          <Text style={styles.headerSubtitle}>{t('dashboard.title')}</Text>
        </View>
        <View style={styles.headerActions}>
          {/* Notification Settings Button */}
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={openNotificationSettings}
          >
            <Ionicons name="notifications-outline" size={24} color="#3b82f6" />
          </TouchableOpacity>
          <LanguageButton />
          <View style={styles.profileContainer}>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={() => setShowProfileMenu(!showProfileMenu)}
            >
              <Ionicons name="person-circle-outline" size={32} color="#3b82f6" />
            </TouchableOpacity>
            
            {showProfileMenu && (
              <View style={styles.profileDropdown}>
                <TouchableOpacity 
                  style={styles.logoutButton}
                  onPress={handleLogout}
                >
                  <Ionicons name="log-out-outline" size={16} color="#EF4444" />
                  <Text style={styles.logoutText}>{t('auth.logout')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={[
          styles.overlay, 
          { display: showProfileMenu ? 'flex' : 'none' }
        ]}
        onPress={() => setShowProfileMenu(false)}
        activeOpacity={1}
      >
        <View />
      </TouchableOpacity>

      <ScrollView style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people-outline" size={24} color="#3b82f6" />
            <Text style={styles.statNumber}>324</Text>
            <Text style={styles.statLabel}>{t('dashboard.stats.totalAgents')}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="cube-outline" size={24} color="#10b981" />
            <Text style={styles.statNumber}>15</Text>
            <Text style={styles.statLabel}>{t('dashboard.stats.totalProducts')}</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="card-outline" size={24} color="#f59e0b" />
            <Text style={styles.statNumber}>₺52.4M</Text>
            <Text style={styles.statLabel}>{t('dashboard.stats.totalPremium')}</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="analytics-outline" size={24} color="#ef4444" />
            <Text style={styles.statNumber}>%67.3</Text>
            <Text style={styles.statLabel}>{t('dashboard.stats.lossRatio')}</Text>
          </View>
        </View>

        {/* Quick Analysis Section */}
        <View style={styles.analysisCard}>
          <View style={styles.analysisHeader}>
            <Ionicons name="analytics" size={24} color="#8B5CF6" />
            <Text style={styles.analysisTitle}>{t('analysis.quickAnalysis')}</Text>
          </View>
          <Text style={styles.analysisSubtitle}>
            {t('analysis.subtitle')}
          </Text>
          
          <View style={styles.analysisButtons}>
            <TouchableOpacity 
              style={[styles.analysisButton, styles.generalAnalysis]}
              onPress={() => startQuickAnalysis('general', 'sample')}
              disabled={isStartingAnalysis}
            >
              <Ionicons name="bulb-outline" size={20} color="#3b82f6" />
              <Text style={[styles.analysisButtonText, { color: '#3b82f6' }]}>
                {t('analysis.general')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.analysisButton, styles.trendAnalysis]}
              onPress={() => startQuickAnalysis('trends', 'sample')}
              disabled={isStartingAnalysis}
            >
              <Ionicons name="trending-up-outline" size={20} color="#10b981" />
              <Text style={[styles.analysisButtonText, { color: '#10b981' }]}>
                {t('analysis.trends')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.analysisButtons}>
            <TouchableOpacity 
              style={[styles.analysisButton, styles.anomalyAnalysis]}
              onPress={() => startQuickAnalysis('anomaly', 'sample')}
              disabled={isStartingAnalysis}
            >
              <Ionicons name="warning-outline" size={20} color="#f59e0b" />
              <Text style={[styles.analysisButtonText, { color: '#f59e0b' }]}>
                {t('analysis.anomaly')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.analysisButton, styles.forecastAnalysis]}
              onPress={() => startQuickAnalysis('forecast', 'sample')}
              disabled={isStartingAnalysis}
            >
              <Ionicons name="telescope-outline" size={20} color="#8B5CF6" />
              <Text style={[styles.analysisButtonText, { color: '#8B5CF6' }]}>
                {t('analysis.forecast')}
              </Text>
            </TouchableOpacity>
          </View>

          {isStartingAnalysis && (
            <View style={styles.analysisLoading}>
              <Text style={styles.analysisLoadingText}>{t('analysis.starting')}</Text>
            </View>
          )}
        </View>

        {/* Query Input Card */}
        <View style={styles.queryCard}>
          <Text style={styles.queryTitle}>{t('queryInput.title')}</Text>
          <Text style={styles.querySubtitle}>
            {t('queryInput.subtitle')}
          </Text>
          <TouchableOpacity style={styles.queryInput} onPress={openQueryInput}>
            <Text style={styles.queryPlaceholder}>
              {t('dashboard.examplePlaceholder')}
            </Text>
            <Ionicons name="search-outline" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Example Queries */}
        <View style={styles.examplesCard}>
          <Text style={styles.examplesTitle}>{t('dashboard.examples.title')}</Text>
          
          <TouchableOpacity 
            style={styles.exampleItem}
            onPress={openQueryInput}
          >
            <Ionicons name="chevron-forward-outline" size={16} color="#3b82f6" />
            <Text style={styles.exampleText}>
              {t('dashboard.exampleQueries.query1')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.exampleItem}
            onPress={openQueryInput}
          >
            <Ionicons name="chevron-forward-outline" size={16} color="#3b82f6" />
            <Text style={styles.exampleText}>
              {t('dashboard.exampleQueries.query2')}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.exampleItem}
            onPress={openQueryInput}
          >
            <Ionicons name="chevron-forward-outline" size={16} color="#3b82f6" />
            <Text style={styles.exampleText}>
              {t('dashboard.exampleQueries.query3')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Performance Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
            <Text style={styles.tipsTitle}>{t('dashboard.tips.title')}</Text>
          </View>
          
          <Text style={styles.tipText}>• {t('dashboard.tips.narrowDateRange')}</Text>
          <Text style={styles.tipText}>• {t('dashboard.tips.fewerEntities')}</Text>
          <Text style={styles.tipText}>• {t('dashboard.tips.limitResults')}</Text>
        </View>
      </ScrollView>

      {/* Analysis Modal */}
      {currentAnalysisJobId && (
        <AnalysisResultModal
          jobId={currentAnalysisJobId}
          analysisType={currentAnalysisType}
          visible={analysisModalVisible}
          onClose={handleAnalysisModalClose}
          onComplete={handleAnalysisComplete}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#EBF4FF',
  },
  profileContainer: {
    position: 'relative',
  },
  profileButton: {
    padding: 4,
  },
  profileDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 120,
    zIndex: 1000,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  queryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  queryHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  analysisCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginLeft: 12,
  },
  analysisSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  analysisButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  analysisButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    gap: 8,
  },
  generalAnalysis: {
    backgroundColor: '#EBF4FF',
  },
  trendAnalysis: {
    backgroundColor: '#ECFDF5',
  },
  anomalyAnalysis: {
    backgroundColor: '#FFFBEB',
  },
  forecastAnalysis: {
    backgroundColor: '#F3E8FF',
  },
  analysisButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  analysisLoading: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  analysisLoadingText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontStyle: 'italic',
  },
  queryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  queryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  querySubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  queryInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  queryPlaceholder: {
    flex: 1,
    color: '#94a3b8',
    fontSize: 16,
  },
  examplesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  examplesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  exampleText: {
    flex: 1,
    fontSize: 14,
    color: '#475569',
    marginLeft: 12,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
    marginBottom: 4,
  },
});

export default DashboardScreen;