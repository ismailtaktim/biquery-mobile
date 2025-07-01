// src/components/analytics/AnalysisResultModal.tsx - TypeScript hataları düzeltildi
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/apiService';
import { useLanguage } from '../../context/LanguageContext';

const { width, height } = Dimensions.get('window');

interface AnalysisResultModalProps {
  jobId: string;
  analysisType: 'general' | 'anomaly' | 'forecast' | 'trends';
  visible: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

interface AnalysisResult {
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  result?: AnalysisData | null;
  results?: AnalysisData | null;
  insights?: any[];
  recommendations?: any[];
  elapsed_time?: number;
  from_cache?: boolean;
  original_language?: string;
  error?: string;
}

interface AnalysisData {
  insights?: any[];
  recommendations?: any[];
  summary?: string;
  details?: string;
  used_method?: string;
}

interface Insight {
  title?: string;
  description?: string;
}

interface Recommendation {
  title?: string;
  description?: string;
}

const AnalysisResultModal: React.FC<AnalysisResultModalProps> = ({
  jobId,
  analysisType,
  visible,
  onClose,
  onComplete
}) => {
  const { t } = useLanguage();
  
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Refs for cleanup - React Native timer types
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attemptCountRef = useRef(0);
  const isMountedRef = useRef(false);

  const maxAttempts = 30;

  // Analysis type titles - Dil bazlı
  const getAnalysisTitle = () => {
    switch (analysisType) {
      case 'general': return t('analysis.general') || 'Genel Analiz';
      case 'anomaly': return t('analysis.anomaly') || 'Anomali Analizi';
      case 'forecast': return t('analysis.forecast') || 'Tahmin Analizi';
      case 'trends': return t('analysis.trends') || 'Trend Analizi';
      default: return t('analysis.dataAnalysis') || 'Veri Analizi';
    }
  };

  // Status messages - Dil bazlı
  const getStatusMessage = (progressValue: number) => {
    if (progressValue < 20) return t('analysis.status.starting') || 'Analiz başlatılıyor...';
    if (progressValue < 40) return t('analysis.status.processing') || 'Veriler işleniyor...';
    if (progressValue < 70) return t('analysis.status.analyzing') || 'Veriler analiz ediliyor...';
    if (progressValue < 90) return t('analysis.status.preparing') || 'Sonuçlar hazırlanıyor...';
    return t('analysis.status.finalizing') || 'Son kontroller yapılıyor...';
  };

  // Component lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    setStatusMessage(t('analysis.status.starting') || 'Analiz başlatılıyor...');
    return () => {
      isMountedRef.current = false;
      clearAllPolling();
    };
  }, [t]);

  // Start analysis when modal opens
  useEffect(() => {
    if (visible && jobId) {
      startStatusPolling();
      startProgressAnimation();
      startPulseAnimation();
    } else if (!visible) {
      clearAllPolling();
    }
    return () => clearAllPolling();
  }, [visible, jobId]);

  // Clear all intervals
  const clearAllPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    attemptCountRef.current = 0;
  };

  // Start pulse animation for spinner
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Start progress animation
  const startProgressAnimation = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    setProgress(0);
    let currentProgress = 0;

    progressIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        clearInterval(progressIntervalRef.current!);
        return;
      }

      if (currentProgress < 20) {
        currentProgress += 2;
      } else if (currentProgress < 40) {
        currentProgress += 1;
      } else if (currentProgress < 70) {
        currentProgress += 0.5;
      } else if (currentProgress < 90) {
        currentProgress += 0.2;
      } else if (currentProgress < 95) {
        currentProgress += 0.05;
      }

      const newProgress = Math.min(currentProgress, 95);
      setProgress(newProgress);
      setStatusMessage(getStatusMessage(newProgress));

      // Animate progress bar
      Animated.timing(progressAnim, {
        toValue: newProgress / 100,
        duration: 100,
        useNativeDriver: false,
      }).start();

      if (currentProgress >= 95) {
        clearInterval(progressIntervalRef.current!);
        progressIntervalRef.current = null;
      }
    }, 100);
  };

  // Start status polling
  const startStatusPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    setLoading(true);
    setError(null);
    attemptCountRef.current = 0;

    checkStatus();

    pollingIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        clearAllPolling();
        return;
      }

      attemptCountRef.current += 1;

      if (attemptCountRef.current >= maxAttempts) {
        clearAllPolling();
        if (isMountedRef.current) {
          setError(t('analysis.errors.timeout') || 'Analiz zaman aşımına uğradı');
          setLoading(false);
          setProgress(0);
          setStatusMessage(t('analysis.status.timeout') || 'Zaman aşımı');
        }
      } else {
        checkStatus();
      }
    }, 3000);
  };

  // Check analysis status
  const checkStatus = async () => {
    if (!jobId || !isMountedRef.current) return;

    try {
      const response = await apiService.getAnalysisStatus(jobId);
      
      if (!isMountedRef.current) return;

      setResults(response);

      // Update progress if backend provides it
      if (response.progress !== undefined && response.progress !== null) {
        if (response.progress > progress || response.status === 'completed') {
          setProgress(response.progress);
          setStatusMessage(getStatusMessage(response.progress));
          
          Animated.timing(progressAnim, {
            toValue: response.progress / 100,
            duration: 300,
            useNativeDriver: false,
          }).start();
        }
      }

      // Handle status changes
      if (response.status === 'completed') {
        handleAnalysisCompleted();
      } else if (response.status === 'failed') {
        handleAnalysisFailed(response.error || response.message || (t('analysis.errors.unknown') || 'Bilinmeyen hata'));
      } else if (response.status === 'pending' && response.result) {
        handleCachedResult();
      }

    } catch (error: any) {
      if (!isMountedRef.current) return;

      if (error.message?.includes('not found')) {
        handleAnalysisFailed(t('analysis.errors.notFound') || 'Analiz bulunamadı');
      } else {
        handleAnalysisFailed((t('analysis.errors.statusCheck') || 'Durum kontrolü hatası: ') + error.message);
      }
    }
  };

  // Handle analysis completion
  const handleAnalysisCompleted = () => {
    clearAllPolling();
    if (!isMountedRef.current) return;

    setProgress(100);
    setStatusMessage(t('analysis.status.completed') || 'Analiz tamamlandı');
    setLoading(false);

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start();

    if (onComplete) {
      onComplete();
    }
  };

  // Handle analysis failure
  const handleAnalysisFailed = (message: string) => {
    clearAllPolling();
    if (!isMountedRef.current) return;

    setLoading(false);
    setError(message);
    setProgress(0);
    setStatusMessage(t('analysis.status.failed') || 'Analiz başarısız');

    if (onComplete) {
      onComplete();
    }
  };

  // Handle cached result
  const handleCachedResult = () => {
    clearAllPolling();
    if (!isMountedRef.current) return;

    setLoading(false);
    setProgress(100);
    setStatusMessage(t('analysis.status.fromCache') || 'Önbellekten yüklendi');

    if (onComplete) {
      onComplete();
    }
  };

  // Extract insights from result
  const extractInsights = (data: any): Insight[] => {
    try {
      if (typeof data.insights === 'string') {
        try {
          const parsedInsights = JSON.parse(data.insights);
          return Array.isArray(parsedInsights) ? parsedInsights : [];
        } catch {
          return [{ title: t('analysis.result') || 'Sonuç', description: data.insights }];
        }
      }

      if (Array.isArray(data.insights)) {
        return data.insights;
      }

      if (typeof data.insights === 'object' && data.insights !== null) {
        return Object.entries(data.insights).map(([key, value]) => ({
          title: key,
          description: String(value)
        }));
      }

      return [];
    } catch {
      return [];
    }
  };

  // Render loading content
  const renderLoadingContent = () => (
    <View style={styles.loadingContainer}>
      <Animated.View 
        style={[
          styles.spinnerContainer,
          { transform: [{ scale: pulseAnim }] }
        ]}
      >
        <ActivityIndicator size="large" color="#3b82f6" />
      </Animated.View>
      
      <Text style={styles.statusText}>{statusMessage}</Text>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              { 
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                })
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{Math.round(progress)}%</Text>
      </View>

      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={checkStatus}
      >
        <Ionicons name="refresh" size={16} color="#3b82f6" />
        <Text style={styles.refreshText}>{t('analysis.checkStatus') || 'Durumu Kontrol Et'}</Text>
      </TouchableOpacity>

      <Text style={styles.hintText}>
        {progress < 50 
          ? (t('analysis.hints.inProgress') || 'Analiz arka planda devam ediyor...')
          : (t('analysis.hints.almostDone') || 'Analiz neredeyse tamamlanıyor...')
        }
      </Text>
    </View>
  );

  // Render result content
  const renderResultContent = () => {
    if (!results) return null;

    const resultData = results.result || results.results;
    if (!resultData) {
      return (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={24} color="#f59e0b" />
          <Text style={styles.warningText}>{t('analysis.noResultData') || 'Sonuç verisi bulunamadı'}</Text>
        </View>
      );
    }

    const insights = extractInsights(resultData);

    return (
      <ScrollView style={styles.resultContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.resultHeader}>
          <Ionicons name="bulb" size={24} color="#3b82f6" />
          <Text style={styles.resultTitle}>{t('analysis.results') || 'Analiz Sonuçları'}</Text>
        </View>

        {insights.length > 0 ? (
          <View style={styles.insightsContainer}>
            {insights.map((insight: Insight, index: number) => (
              <View key={index} style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Ionicons name="bulb-outline" size={18} color="#f59e0b" />
                  <Text style={styles.insightTitle}>
                    {insight.title || ((t('analysis.insight') || 'Insight') + ` ${index + 1}`)}
                  </Text>
                </View>
                <Text style={styles.insightDescription}>
                  {insight.description || (t('analysis.noDescription') || 'Açıklama bulunamadı')}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noInsightsContainer}>
            <Ionicons name="information-circle" size={24} color="#6b7280" />
            <Text style={styles.noInsightsText}>{t('analysis.noResults') || 'Analiz sonucu bulunamadı'}</Text>
          </View>
        )}

        {/* Recommendations */}
        {resultData.recommendations && resultData.recommendations.length > 0 && (
          <View style={styles.recommendationsContainer}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.sectionTitle}>{t('analysis.recommendations') || 'Öneriler'}</Text>
            </View>
            {resultData.recommendations.map((rec: Recommendation, index: number) => (
              <View key={index} style={styles.recommendationCard}>
                <Text style={styles.recommendationText}>
                  {typeof rec === 'string' ? rec : rec.description || rec.title || (t('analysis.recommendation') || 'Öneri')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Analysis Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>{t('analysis.info.title') || 'Analiz Bilgileri'}</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{(t('analysis.info.processingTime') || 'İşlem Süresi') + ':'}</Text>
            <Text style={styles.infoValue}>
              {results.elapsed_time ? `${(results.elapsed_time * 1000).toFixed(0)} ms` : (t('analysis.info.notSpecified') || 'Belirtilmemiş')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{(t('analysis.info.cacheUsed') || 'Önbellek Kullanıldı') + ':'}</Text>
            <Text style={styles.infoValue}>
              {results.from_cache ? (t('common.yes') || 'Evet') : (t('common.no') || 'Hayır')}
            </Text>
          </View>
          {results.original_language && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{(t('analysis.info.originalLanguage') || 'Orijinal Dil') + ':'}</Text>
              <Text style={styles.infoValue}>{results.original_language}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // Render error content
  const renderErrorContent = () => (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={48} color="#ef4444" />
      <Text style={styles.errorTitle}>{t('analysis.errorTitle') || 'Analiz Hatası'}</Text>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  // Main render
  const renderContent = () => {
    if (error) {
      return renderErrorContent();
    }

    // Loading states
    const isLoading = !results || loading || results.status === 'running';
    const isPendingWithoutResult = results?.status === 'pending' && !results.result;
    const hasCachedResult = results?.status === 'pending' && results.result;
    const isCompleted = results?.status === 'completed';

    if (isLoading || isPendingWithoutResult) {
      // Show cached result if available while pending
      if (hasCachedResult) {
        return renderResultContent();
      }
      return renderLoadingContent();
    }

    if (isCompleted || hasCachedResult) {
      return renderResultContent();
    }

    // Unknown status
    return (
      <View style={styles.unknownContainer}>
        <Text style={styles.unknownText}>
          {(t('analysis.status.label') || 'Durum') + ': ' + (results?.status || (t('analysis.status.unknown') || 'Bilinmiyor'))}
        </Text>
        {results?.message && <Text style={styles.unknownMessage}>{results.message}</Text>}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="analytics" size={24} color="#3b82f6" />
            <Text style={styles.headerTitle}>{getAnalysisTitle()}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Status Badge */}
        {results && (
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusBadge,
              results.status === 'running' && styles.statusRunning,
              results.status === 'completed' && styles.statusCompleted,
              results.status === 'failed' && styles.statusFailed,
              (results.status === 'pending' && results.result) && styles.statusCached,
            ]}>
              <Text style={styles.statusBadgeText}>
                {results.status === 'running' && (t('analysis.statusBadge.running') || 'İşleniyor')}
                {results.status === 'completed' && (t('analysis.statusBadge.completed') || 'Tamamlandı')}
                {results.status === 'failed' && (t('analysis.statusBadge.failed') || 'Başarısız')}
                {(results.status === 'pending' && results.result) && (t('analysis.statusBadge.cached') || 'Önbellekten')}
                {(results.status === 'pending' && !results.result) && (t('analysis.statusBadge.pending') || 'Bekliyor')}
              </Text>
            </View>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
  },
  closeButton: {
    padding: 8,
  },
  statusContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#6b7280',
  },
  statusRunning: {
    backgroundColor: '#3b82f6',
  },
  statusCompleted: {
    backgroundColor: '#10b981',
  },
  statusFailed: {
    backgroundColor: '#ef4444',
  },
  statusCached: {
    backgroundColor: '#10b981',
  },
  statusBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  spinnerContainer: {
    marginBottom: 24,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 20,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  refreshText: {
    color: '#3b82f6',
    fontSize: 14,
    marginLeft: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  resultContainer: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
  },
  insightsContainer: {
    marginBottom: 24,
  },
  insightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  insightDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  recommendationsContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  recommendationCard: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
  },
  recommendationText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 18,
  },
  infoContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ef4444',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 16,
    color: '#92400e',
    marginLeft: 12,
  },
  noInsightsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  noInsightsText: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 12,
  },
  unknownContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  unknownText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  unknownMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default AnalysisResultModal;

export type { AnalysisResultModalProps, AnalysisResult, Insight, Recommendation };