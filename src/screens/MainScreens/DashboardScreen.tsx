// src/screens/MainScreens/DashboardScreen.tsx - Enhanced with comprehensive language support
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import EnhancedQueryInput from '../../components/query/EnhancedQueryInput';
import QueryResults from '../../components/query/QueryResults';
import AnalysisResultModal from '../../components/analytics/AnalysisResultModal';
import LanguageButton from '../../components/common/LanguageButton';
import { useLanguage, useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { withLanguage } from '../../hoc/withLanguage';
import apiService from '../../services/apiService';
import { showSuccessToast, showErrorToast, showWarningToast, showInfoToast } from '../../utils/toastUtils';


interface QueryData {
  query: string;
  results: any;
}

const DashboardScreen: React.FC = () => {
  const { t, currentLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const [currentQuery, setCurrentQuery] = useState<QueryData | null>(null);
  const [showQueryInput, setShowQueryInput] = useState(false);
  
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

  // Language-aware content
  const getLocalizedContent = () => {
    const content = {
      tr: {
        welcomeMessage: `Hoş geldiniz, ${user?.username || 'Kullanıcı'}!`,
        analysisExamples: [
          '2024 yılında en çok prim üreten 10 acente',
          'Son 12 ayda aylık prim üretimi trendi',
          'Acentelerin hasar oranları ve prim üretimleri',
          'Gelecek 6 ay prim üretimi tahmini'
        ],
        quickTips: [
          'Tarih aralığını daraltın (ör: son 3 ay)',
          'Az sayıda acente/ürün sorgulamayı deneyin',
          'Sonuçları sınırlandırın (ör: ilk 10 acente)',
          'Spesifik bölge veya ürün belirtin'
        ]
      },
      en: {
        welcomeMessage: `Welcome, ${user?.username || 'User'}!`,
        analysisExamples: [
          'Top 10 agents with highest premium in 2024',
          'Monthly premium production trend in last 12 months',
          'Agent loss ratios and premium productions',
          'Next 6 months premium production forecast'
        ],
        quickTips: [
          'Narrow date range (e.g. last 3 months)',
          'Try querying fewer agents/products',
          'Limit results (e.g. top 10 agents)',
          'Specify region or product type'
        ]
      },
      de: {
        welcomeMessage: `Willkommen, ${user?.username || 'Benutzer'}!`,
        analysisExamples: [
          'Top 10 Agenturen mit höchster Prämie in 2024',
          'Monatlicher Prämienproduktionstrend in den letzten 12 Monaten',
          'Agenten-Schadenquoten und Prämienproduktionen',
          'Prämienproduktionsprognose für die nächsten 6 Monate'
        ],
        quickTips: [
          'Zeitraum eingrenzen (z.B. letzte 3 Monate)',
          'Weniger Agenten/Produkte abfragen',
          'Ergebnisse begrenzen (z.B. Top 10 Agenten)',
          'Region oder Produkttyp spezifizieren'
        ]
      },
      es: {
        welcomeMessage: `Bienvenido, ${user?.username || 'Usuario'}!`,
        analysisExamples: [
          'Top 10 agentes con mayor prima en 2024',
          'Tendencia de producción mensual de primas en los últimos 12 meses',
          'Ratios de siniestralidad de agentes y producciones de primas',
          'Pronóstico de producción de primas para los próximos 6 meses'
        ],
        quickTips: [
          'Acotar rango de fechas (ej: últimos 3 meses)',
          'Intentar consultar menos agentes/productos',
          'Limitar resultados (ej: top 10 agentes)',
          'Especificar región o tipo de producto'
        ]
      }
    };
    
    return content[currentLanguage as keyof typeof content] || content.tr;
  };

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

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout'),
      t('auth.loginRequired'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('auth.logout'), 
          style: 'destructive',
          onPress: logout 
        }
      ]
    );
  };

  // Analysis functions with language support
  const startQuickAnalysis = async (analysisType: 'general' | 'anomaly' | 'forecast' | 'trends', sampleQuery: string) => {
    if (isStartingAnalysis) return;

    setIsStartingAnalysis(true);

    try {
      const localizedContent = getLocalizedContent();
      const queryToUse = localizedContent.analysisExamples[
        analysisType === 'general' ? 0 :
        analysisType === 'trends' ? 1 :
        analysisType === 'anomaly' ? 2 : 3
      ];
      
      // Show loading message in current language
      Alert.alert(
        t('analysis.starting'),
        `${getAnalysisTypeTitle(analysisType)} ${t('analysis.starting').toLowerCase()}...`,
        [{ text: t('common.ok') }]
      );
      
      // Execute query first
      const queryResults = await apiService.executeQuery(queryToUse, currentLanguage);
      
      if (!queryResults.data || queryResults.data.length < 5) {
        Alert.alert(
          t('analysis.insufficientData'),
          t('analysis.minDataRequired')
        );
        setIsStartingAnalysis(false);
        return;
      }

      // Start analysis with language parameter
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
        t('analysis.errorTitle'),
        error.message || t('analysis.generalError')
      );
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  const getAnalysisTypeTitle = (type: string) => {
    const titles = {
      general: t('analysis.general'),
      trends: t('analysis.trends'),
      anomaly: t('analysis.anomaly'),
      forecast: t('analysis.forecast')
    };
    return titles[type as keyof typeof titles] || t('analysis.dataAnalysis');
  };

  const handleAnalysisComplete = () => {
    console.log('📊 Quick analysis completed');
  };

  const handleAnalysisModalClose = () => {
    setAnalysisModalVisible(false);
    setCurrentAnalysisJobId(null);
  };

  // If query result exists, show results
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

  // If query input is open, show EnhancedQueryInput
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
          <LanguageButton variant="compact" />
        </View>

        <EnhancedQueryInput 
          onQuerySubmit={handleQuerySubmit}
          onError={handleQueryError}
        />
      </View>
    );
  }

  const localizedContent = getLocalizedContent();

  // Normal Dashboard view
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>BiQuery</Text>
          <Text style={styles.headerSubtitle}>{localizedContent.welcomeMessage}</Text>
        </View>
        <View style={styles.headerActions}>
          <LanguageButton variant="compact" />
          <TouchableOpacity style={styles.profileButton} onPress={handleLogout}>
            <Ionicons name="person-circle-outline" size={32} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
              <ActivityIndicator size="small" color="#8B5CF6" />
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
              {localizedContent.analysisExamples[0]}...
            </Text>
            <Ionicons name="search-outline" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Example Queries */}
        <View style={styles.examplesCard}>
          <Text style={styles.examplesTitle}>{t('dashboard.examples.title')}</Text>
          
          {localizedContent.analysisExamples.slice(0, 3).map((query, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.exampleItem}
              onPress={openQueryInput}
            >
              <Ionicons name="chevron-forward-outline" size={16} color="#3b82f6" />
              <Text style={styles.exampleText}>{query}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Performance Tips */}
        <View style={styles.tipsCard}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color="#f59e0b" />
            <Text style={styles.tipsTitle}>{t('dashboard.tips.title')}</Text>
          </View>
          
          {localizedContent.quickTips.map((tip, index) => (
            <Text key={index} style={styles.tipText}>• {tip}</Text>
          ))}
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
  profileButton: {
    padding: 4,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
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
    marginBottom: 20,
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

export default withLanguage(DashboardScreen);