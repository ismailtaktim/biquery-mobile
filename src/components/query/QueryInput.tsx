// src/components/query/QueryInput.tsx - Enhanced with comprehensive language support
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation, useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';

const { width } = Dimensions.get('window');

interface QueryInputProps {
  onQuerySubmit: (query: string, results: any) => void;
  onError: (error: string) => void;
}

interface Suggestion {
  text: string;
  type: 'history' | 'suggestion' | 'example';
}

const QueryInput: React.FC<QueryInputProps> = ({ onQuerySubmit, onError }) => {
  const { t, currentLanguage } = useLanguage();
  const { logout } = useAuth();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const inputRef = useRef<TextInput>(null);
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Language-specific example queries
  const getExampleQueries = () => {
    const examples = {
      tr: [
        "2024 yılında en çok prim üreten 5 acente",
        "Son 6 ayda Kasko ürünü için aylık prim trendi çiz",
        "İstanbul'daki toplam poliçeleri göster",
        "Hangi ürünlerin hasar/prim oranı %50'nin altında?",
        "Acentelerin yıllık üretim karşılaştırması",
        "En çok hasarlı poliçe türü hangisi?",
        "Bölgelere göre prim dağılımını göster",
        "2023-2024 karşılaştırmalı satış analizi"
      ],
      en: [
        "Top 5 agents with highest premium in 2024",
        "Draw monthly premium trend for Comprehensive product for the last 6 months",
        "Show total policies in Istanbul",
        "Which products have loss/premium ratio below 50%?",
        "Annual production comparison of agents",
        "Which policy type has the most claims?",
        "Show premium distribution by regions",
        "2023-2024 comparative sales analysis"
      ],
      de: [
        "Top 5 Agenturen mit höchster Prämie in 2024",
        "Zeichne monatlichen Prämientrend für Kaskoversicherung der letzten 6 Monate",
        "Zeige Gesamtpolicen in Istanbul",
        "Welche Produkte haben Schaden/Prämien-Verhältnis unter 50%?",
        "Jährlicher Produktionsvergleich der Agenturen",
        "Welche Policenart hat die meisten Schäden?",
        "Zeige Prämienverteilung nach Regionen",
        "2023-2024 vergleichende Verkaufsanalyse"
      ],
      es: [
        "Top 5 agentes con mayor prima en 2024",
        "Dibuja tendencia mensual de primas para producto Integral en los últimos 6 meses",
        "Mostrar total de pólizas en Estambul",
        "¿Qué productos tienen ratio siniestro/prima por debajo del 50%?",
        "Comparación anual de producción de agentes",
        "¿Qué tipo de póliza tiene más siniestros?",
        "Mostrar distribución de primas por regiones",
        "Análisis comparativo de ventas 2023-2024"
      ]
    };
    
    return examples[currentLanguage as keyof typeof examples] || examples.tr;
  };

  // Component mount - load examples
  useEffect(() => {
    loadExampleQueries();
  }, [currentLanguage]); // Reload when language changes

  const loadExampleQueries = async () => {
    try {
      // Try to get examples from API first
      const response = await apiService.getExamples();
      const examples = response?.examples || [];
      
      if (examples && examples.length > 0) {
        const exampleSuggestions: Suggestion[] = examples.map((query: string) => ({
          text: query,
          type: 'example' as const
        }));
        setSuggestions(exampleSuggestions);
      } else {
        // Use local examples if API fails
        const localExamples = getExampleQueries();
        const fallbackSuggestions: Suggestion[] = localExamples.map(query => ({
          text: query,
          type: 'example' as const
        }));
        setSuggestions(fallbackSuggestions);
      }
    } catch (error) {
      console.warn('Failed to load examples from API, using local examples');
      const localExamples = getExampleQueries();
      const fallbackSuggestions: Suggestion[] = localExamples.map(query => ({
        text: query,
        type: 'example' as const
      }));
      setSuggestions(fallbackSuggestions);
    }
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    
    if (text.trim().length === 0) {
      loadExampleQueries();
      setShowSuggestions(true);
    } else {
      fetchSuggestions(text);
    }
  };

  const fetchSuggestions = async (searchText: string) => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    suggestionTimeoutRef.current = setTimeout(async () => {
      try {
        const suggestionResponse = await apiService.getSuggestions(searchText, true, [], currentLanguage);
        const suggestionResults = suggestionResponse?.suggestions || [];
        
        if (suggestionResults && suggestionResults.length > 0) {
          const newSuggestions: Suggestion[] = suggestionResults.map((suggestion: string) => ({
            text: suggestion,
            type: 'suggestion' as const
          }));
          setSuggestions(newSuggestions);
        } else {
          // Filter local examples based on search
          const localExamples = getExampleQueries();
          const filteredExamples = localExamples.filter(example => 
            example.toLowerCase().includes(searchText.toLowerCase())
          );
          
          const exampleSuggestions: Suggestion[] = filteredExamples.map(query => ({
            text: query,
            type: 'example' as const
          }));
          setSuggestions(exampleSuggestions);
        }
        setShowSuggestions(true);
      } catch (error) {
        console.warn('Failed to fetch suggestions:', error);
        // Keep current suggestions on error
      }
    }, 300);
  };

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!query.trim()) {
      Alert.alert(t('common.warning'), t('queryInput.emptyQuery'));
      return;
    }

    setIsLoading(true);
    setShowSuggestions(false);

    try {
      console.log('🔍 Executing query in language:', currentLanguage);
      const results = await apiService.executeQuery(query.trim(), currentLanguage);
      
      // Check if results are valid
      if (results && results.success !== false) {
        onQuerySubmit(query.trim(), results);
        
        // Show success message
        Alert.alert(
          t('common.success'),
          t('queryInput.querySuccess'),
          [{ text: t('common.ok') }]
        );
      } else {
        throw new Error(results?.message || t('queryInput.queryError'));
      }
      
    } catch (error: any) {
      console.error('Query execution error:', error);
      
      let errorMessage = error.message || t('queryInput.queryError');
      
      // Handle specific error types with localized messages
      if (error.code === 'TOKEN_EXPIRED' || error.message?.includes('token') || error.message?.includes('401')) {
        errorMessage = t('queryInput.tokenExpired');
        
        // Auto-logout after 2 seconds
        setTimeout(() => {
          Alert.alert(
            t('auth.sessionExpired'),
            t('auth.loginRequired'),
            [
              {
                text: t('auth.login'),
                onPress: logout
              }
            ]
          );
        }, 2000);
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = t('errors.network');
      } else if (error.code === 'TIMEOUT') {
        errorMessage = t('errors.timeout');
      }
      
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearQuery = () => {
    setQuery('');
    loadExampleQueries();
    setShowSuggestions(true);
    inputRef.current?.focus();
  };

  const getLoadingMessage = () => {
    const messages = {
      tr: 'AI sorgunuzu analiz ediyor ve SQL oluşturuyor...',
      en: 'AI is analyzing your query and generating SQL...',
      de: 'KI analysiert Ihre Anfrage und generiert SQL...',
      es: 'La IA está analizando su consulta y generando SQL...'
    };
    
    return messages[currentLanguage as keyof typeof messages] || messages.tr;
  };

  const getSuggestionsTitle = () => {
    return query.trim() ? t('queryInput.suggestions') : t('queryInput.examples');
  };

  return (
    <View style={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>{t('dashboard.title')}</Text>
          <Text style={styles.heroSubtitle}>
            {t('queryInput.subtitle')}
          </Text>
        </View>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchCard}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder={t('queryInput.placeholder')}
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={handleQueryChange}
              multiline
              maxLength={500}
              editable={!isLoading}
            />
            {query.length > 0 && !isLoading && (
              <TouchableOpacity onPress={handleClearQuery} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity 
            style={[styles.searchButton, (isLoading || !query.trim()) && styles.searchButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.searchButtonText}>{t('queryInput.analyzeButton')}...</Text>
              </View>
            ) : (
              <View style={styles.searchButtonContent}>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                <Text style={styles.searchButtonText}>{t('queryInput.analyzeButton')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Loading Progress */}
        {isLoading && (
          <View style={styles.loadingProgress}>
            <View style={styles.progressBar}>
              <View style={styles.progressIndicator} />
            </View>
            <Text style={styles.loadingText}>
              {getLoadingMessage()}
            </Text>
          </View>
        )}
      </View>

      {/* Suggestions Section */}
      {!isLoading && showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsTitle}>
            {getSuggestionsTitle()}
          </Text>
          
          <ScrollView style={styles.suggestionsList} showsVerticalScrollIndicator={false}>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={`suggestion-${index}`}
                style={styles.suggestionCard}
                onPress={() => handleSuggestionSelect(suggestion)}
                activeOpacity={0.7}
              >
                <View style={styles.suggestionContent}>
                  <View style={[
                    styles.suggestionIcon,
                    suggestion.type === 'example' ? styles.exampleIcon : styles.suggestionIconDefault
                  ]}>
                    <Ionicons 
                      name={suggestion.type === 'example' ? 'bulb' : 'search'} 
                      size={16} 
                      color={suggestion.type === 'example' ? '#F59E0B' : '#3B82F6'}
                    />
                  </View>
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {suggestion.text}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tips Section */}
      {!isLoading && !query.trim() && (
        <View style={styles.tipsSection}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
            <Text style={styles.tipsTitle}>{t('dashboard.tips.title')}</Text>
          </View>
          
          <Text style={styles.tipText}>• {t('tips.maximumMinimum')}</Text>
          <Text style={styles.tipText}>• {t('tips.timeRange')}</Text>
          <Text style={styles.tipText}>• {t('tips.comparison')}</Text>
          <Text style={styles.tipText}>• {t('tips.grouping')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroSection: {
    backgroundColor: '#667eea',
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#E2E8F0',
    textAlign: 'center',
    opacity: 0.9,
  },
  searchSection: {
    paddingHorizontal: 20,
    marginTop: -20,
    zIndex: 10,
  },
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    maxHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 22,
  },
  clearButton: {
    marginLeft: 12,
    marginTop: 2,
  },
  searchButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  searchButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  searchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingProgress: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressIndicator: {
    height: '100%',
    width: '70%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  suggestionsSection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  suggestionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exampleIcon: {
    backgroundColor: '#FEF3C7',
  },
  suggestionIconDefault: {
    backgroundColor: '#DBEAFE',
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
  },
  tipsSection: {
    backgroundColor: '#FFFBEB',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
    marginTop: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 4,
  },
});

export default QueryInput;