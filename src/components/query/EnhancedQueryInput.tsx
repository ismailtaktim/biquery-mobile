// src/components/query/EnhancedQueryInput.tsx - TypeScript hataları ve dil desteği düzeltildi
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import apiService from '../../services/apiService';
import { useLanguage } from '../../context/LanguageContext'; // ✅ Proper language hook
import { showSuccessToast } from '@/src/utils/toastUtils';

const { width } = Dimensions.get('window');

interface QueryInputProps {
  onQuerySubmit: (query: string, results: any) => void;
  onError: (error: string) => void;
}

interface Suggestion {
  text: string;
  type: 'suggestion' | 'example' | 'smart';
  confidence?: number;
}

const EnhancedQueryInput: React.FC<QueryInputProps> = ({ onQuerySubmit, onError }) => {
  const { t, currentLanguage } = useLanguage(); // ✅ Use proper language hook
  
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [spellingSuggestion, setSpellingSuggestion] = useState<string>('');
  
  const inputRef = useRef<TextInput>(null);
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ✅ Örnek sorgular dil bazlı - Type-safe
  const getExampleQueries = (): string[] => {
    const examples: Record<string, string[]> = {
      tr: [
        "2024 yılında en çok prim üreten 5 acente",
        "Son 6 ayda Kasko ürünü için aylık prim trendi çiz",
        "İstanbul'daki toplam poliçeleri göster",
        "Hangi ürünlerin hasar/prim oranı %50'nin altında?",
        "Acentelerin yıllık üretim karşılaştırması"
      ],
      en: [
        "Top 5 agents with highest premium in 2024",
        "Draw monthly premium trend for Comprehensive product for the last 6 months",
        "Show total policies in Istanbul",
        "Which products have loss/premium ratio below 50%?",
        "Annual production comparison of agents"
      ],
      de: [
        "Top 5 Agenturen mit höchster Prämie im Jahr 2024",
        "Zeichne monatlichen Prämientrend für Kasko-Produkt in den letzten 6 Monaten",
        "Zeige Gesamtpolicen in Istanbul",
        "Welche Produkte haben Schaden/Prämie-Quote unter 50%?",
        "Jährlicher Produktionsvergleich der Agenturen"
      ],
      es: [
        "Los 5 agentes que más prima generaron en 2024",
        "Dibuja la tendencia mensual de prima para producto Casco en los últimos 6 meses",
        "Mostrar el total de pólizas en Madrid",
        "¿Qué productos tienen relación siniestro/prima inferior al 50%?",
        "Comparación de producción anual de agentes"
      ]
    };
    
    return examples[currentLanguage] || examples.tr;
  };

  // Component mount
  useEffect(() => {
    loadExampleQueries();
  }, [currentLanguage]);

  const loadExampleQueries = () => {
    const examples = getExampleQueries();
    const exampleSuggestions: Suggestion[] = examples.map((query: string) => ({
      text: query,
      type: 'example'
    }));
    setSuggestions(exampleSuggestions);
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setSpellingSuggestion('');
    
    if (text.trim().length === 0) {
      loadExampleQueries();
      setShowSuggestions(true);
    } else if (text.trim().length >= 2) {
      // Debounced suggestion fetching
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
      
      suggestionTimeoutRef.current = setTimeout(() => {
        fetchSuggestions(text);
        checkSpelling(text);
      }, 300);
    }
  };

  const fetchSuggestions = async (searchText: string) => {
    try {
      // ✅ API'den akıllı öneriler al (Backend history yönetiyor)
      const suggestionResponse = await apiService.getSuggestions(
        searchText, 
        true, 
        [], // History backend'de yönetiliyor
        currentLanguage
      );
      
      const smartSuggestions: Suggestion[] = (suggestionResponse?.suggestions || [])
        .slice(0, 4)
        .map((suggestion: string) => ({
          text: suggestion,
          type: 'smart' as const
        }));

      // Örnek sorgulardan filtrele
      const examples = getExampleQueries();
      const exampleSuggestions: Suggestion[] = examples
        .filter((example: string) => example.toLowerCase().includes(searchText.toLowerCase()))
        .slice(0, 2)
        .map((query: string) => ({
          text: query,
          type: 'example'
        }));

      // Tüm önerileri birleştir
      const allSuggestions = [...smartSuggestions, ...exampleSuggestions];

      setSuggestions(allSuggestions);
      setShowSuggestions(true);
      
    } catch (error) {
      console.warn('Öneri alma hatası:', error);
      // Hata durumunda sadece örnekleri göster
      const examples = getExampleQueries();
      const fallbackSuggestions: Suggestion[] = examples
        .filter((example: string) => example.toLowerCase().includes(searchText.toLowerCase()))
        .slice(0, 5)
        .map((query: string) => ({
          text: query,
          type: 'example'
        }));
      setSuggestions(fallbackSuggestions);
    }
  };

  const checkSpelling = async (text: string) => {
    try {
      const spellCheck = await apiService.checkSpelling(text, currentLanguage);
      if (spellCheck.correction && spellCheck.confidence > 0.7) {
        setSpellingSuggestion(spellCheck.correction);
      }
    } catch (error) {
      // Yazım kontrolü hatası - sessiz geç
    }
  };

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    setSpellingSuggestion('');
    inputRef.current?.focus();
  };

  const handleSpellingSuggestionAccept = () => {
    setQuery(spellingSuggestion);
    setSpellingSuggestion('');
    inputRef.current?.focus();
  };

  // ✅ Query History kaldırıldı - Backend yönetiyor
  const handleSubmit = async () => {
    if (!query.trim()) {
      Alert.alert(t('common.warning') || 'Uyarı', t('queryInput.emptyQuery') || 'Lütfen bir sorgu girin.');
      return;
    }

    setIsLoading(true);
    setShowSuggestions(false);
    setSpellingSuggestion('');

    try {
      const results = await apiService.executeQuery(query, currentLanguage);
      
      // ✅ History Backend'de yönetiliyor, local storage kullanmıyoruz
      
      onQuerySubmit(query, results);
 
      
    } catch (error: any) {
      let errorMessage = error.message || (t('queryInput.queryError') || 'Sorgu çalıştırılırken bir hata oluştu');
      
      if (error.code === 'TOKEN_EXPIRED') {
        errorMessage = t('queryInput.tokenExpired') || 'Oturum süresi doldu. Lütfen tekrar giriş yapın.';
      }
      
      onError(errorMessage);
      Alert.alert(t('common.error') || 'Hata', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Sesli arama - basitleştirilmiş
  const handleVoiceSearch = () => {
    Alert.alert(t('common.info') || 'Bilgi', t('speechToText.notImplemented') || 'Sesli arama özelliği geliştirilme aşamasında.');
  };

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

  const stopPulseAnimation = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleClearQuery = () => {
    setQuery('');
    setSpellingSuggestion('');
    loadExampleQueries();
    setShowSuggestions(true);
    inputRef.current?.focus();
  };

  const getSuggestionIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'smart': return 'bulb-outline'; 
      case 'example': return 'help-circle-outline';
      default: return 'chevron-forward-outline';
    }
  };

  const getSuggestionColor = (type: string): string => {
    switch (type) {
      case 'smart': return '#3B82F6';
      case 'example': return '#F59E0B';
      default: return '#9CA3AF';
    }
  };

  return (
    <View style={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>{t('queryInput.title') || 'Verilerinizi Keşfedin'}</Text>
        <Text style={styles.heroSubtitle}>
          {t('queryInput.subtitle') || 'Doğal dilde sorun, anında analiz alın'}
        </Text>
      </View>

      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.searchCard}>
          {/* Yazım önerisi */}
          {spellingSuggestion && (
            <View style={styles.spellingSuggestion}>
              <Text style={styles.spellingSuggestionText}>
                {(t('queryInput.didYouMean') || 'Bunu mu demek istediniz') + `: "${spellingSuggestion}"`}
              </Text>
              <TouchableOpacity onPress={handleSpellingSuggestionAccept}>
                <Text style={styles.spellingSuggestionButton}>
                  {t('queryInput.yesCorrect') || 'Evet, düzelt'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder={t('queryInput.placeholder') || 'Örn: 2024 yılında en çok prim üreten acenteler'}
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={handleQueryChange}
              multiline
              maxLength={500}
              editable={!isLoading}
            />
            
            {/* Voice Search Button */}
            <TouchableOpacity 
              onPress={handleVoiceSearch} 
              style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
            >
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Ionicons 
                  name={isListening ? "mic" : "mic-outline"} 
                  size={20} 
                  color={isListening ? "#EF4444" : "#6B7280"} 
                />
              </Animated.View>
            </TouchableOpacity>

            {query.length > 0 && !isLoading && (
              <TouchableOpacity onPress={handleClearQuery} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Listening Status */}
          {isListening && (
            <View style={styles.listeningStatus}>
              <View style={styles.listeningIndicator}>
                <Ionicons name="radio-button-on" size={12} color="#EF4444" />
                <Text style={styles.listeningText}>
                  {t('speechToText.listening') || 'Dinleniyor...'}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={[styles.searchButton, (isLoading || !query.trim()) && styles.searchButtonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? (
              <View style={styles.loadingContent}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.searchButtonText}>{t('common.loading') || 'Yükleniyor...'}</Text>
              </View>
            ) : (
              <View style={styles.searchButtonContent}>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                <Text style={styles.searchButtonText}>
                  {t('queryInput.analyzeButton') || 'Analiz Et'}
                </Text>
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
              {t('queryInput.processingQuery') || 'AI sorgunuzu analiz ediyor ve SQL oluşturuyor...'}
            </Text>
          </View>
        )}
      </View>

      {/* Suggestions Section */}
      {!isLoading && showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsTitle}>
            {query.trim() ? (t('queryInput.suggestions') || 'Öneriler') : (t('queryInput.examples') || 'Örnek Sorgular')}
          </Text>
          
          <ScrollView style={styles.suggestionsList} showsVerticalScrollIndicator={false}>
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={`suggestion-${index}-${suggestion.type}`}
                style={styles.suggestionCard}
                onPress={() => handleSuggestionSelect(suggestion)}
                activeOpacity={0.7}
              >
                <View style={styles.suggestionContent}>
                  <View style={[
                    styles.suggestionIcon,
                    { backgroundColor: getSuggestionColor(suggestion.type) + '20' }
                  ]}>
                    <Ionicons 
                      name={getSuggestionIcon(suggestion.type)} 
                      size={16} 
                      color={getSuggestionColor(suggestion.type)}
                    />
                  </View>
                  <Text style={styles.suggestionText} numberOfLines={2}>
                    {suggestion.text}
                  </Text>
                  {suggestion.type === 'smart' && (
                    <View style={styles.confidenceBadge}>
                      <Text style={styles.confidenceText}>AI</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  spellingSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  spellingSuggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
  },
  spellingSuggestionButton: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
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
  voiceButton: {
    marginLeft: 8,
    marginTop: 2,
    padding: 4,
  },
  voiceButtonActive: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  clearButton: {
    marginLeft: 8,
    marginTop: 2,
  },
  listeningStatus: {
    alignItems: 'center',
    marginBottom: 16,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  listeningText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
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
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 20,
  },
  confidenceBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  confidenceText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default EnhancedQueryInput;