import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../../services/apiService';
import { useLanguage } from '../../context/LanguageContext';
import { periodicNotificationService } from '../../utils/PeriodicNotificationService';

// Kendi debounce fonksiyonu
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

interface QueryInputProps {
  onQuerySubmit: (query: string, results: any) => void;
  onError: (error: string) => void;
  initialQuery?: string;
  onClearResults?: () => void;
}

interface Suggestion {
  text: string;
  type: 'history' | 'suggestion' | 'example';
}

const QueryInput: React.FC<QueryInputProps> = ({ 
  onQuerySubmit, 
  onError, 
  initialQuery, 
  onClearResults 
}) => {
  const { t, currentLanguage } = useLanguage();
  
  // State Management
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  const [correction, setCorrection] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [queryHistory, setQueryHistory] = useState<string[]>([]);
  
  // Refs
  const textInputRef = useRef<TextInput>(null);
  
  // Load settings and history on mount
  useEffect(() => {
    loadUserData();
  }, []);
  
  // Initialize with initial query
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);
  
  // Load user data from storage
  const loadUserData = async () => {
    try {
      // Load AI settings from notification service
      const notificationSettings = periodicNotificationService.getNotificationSettings();
      const aiToggle = notificationSettings.find(s => s.id === 'activityReminder');
      setAiEnabled(aiToggle?.enabled !== false);
      
      // Load query history
      const savedHistory = await AsyncStorage.getItem('queryHistory');
      if (savedHistory) {
        setQueryHistory(JSON.parse(savedHistory));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };
  
  // Get current language
  const getCurrentLanguage = () => {
    return currentLanguage || 'tr';
  };
  
  // Local pattern matching with language support
  const generateLocalSuggestions = useCallback((input: string): Suggestion[] => {
    if (input.length < 2) return [];
    
    const lowerInput = input.toLowerCase();
    const suggestions = new Set<string>();
    
    // Language-specific pattern triggers
    const patternTriggers = {
      'tr': {
        'en yüksek': 'en yüksek prim üreten 5 acente',
        'en düşük': 'en düşük hasar oranına sahip ürünler',
        'son': 'son 3 aydaki satış performansı',
        'ortalama': 'ortalama poliçe bedeli',
        'karşılaştır': 'iki dönem arası karşılaştırma',
        'liste': 'aktif acenteler listesi',
        'toplam': 'toplam prim üretimi',
        'çiz': 'aylık prim trendi çiz'
      },
      'en': {
        'highest': 'top 5 agents with highest premium',
        'lowest': 'products with lowest loss ratio',
        'last': 'sales performance in the last 3 months',
        'average': 'average policy amount',
        'compare': 'comparison between two periods',
        'list': 'list of active agents',
        'total': 'total premium production',
        'draw': 'draw monthly premium trend'
      }
    };
    
    const currentPatterns = patternTriggers[getCurrentLanguage() as keyof typeof patternTriggers] || patternTriggers['tr'];
    
    // Pattern matching
    Object.entries(currentPatterns).forEach(([trigger, template]) => {
      if (lowerInput.includes(trigger)) {
        suggestions.add(template);
      }
    });
    
    // History-based suggestions
    queryHistory.forEach(historyQuery => {
      if (historyQuery.toLowerCase().includes(lowerInput) && 
          historyQuery.toLowerCase() !== lowerInput) {
        suggestions.add(historyQuery);
      }
    });
    
    // Convert to Suggestion objects
    const localSuggestions: Suggestion[] = Array.from(suggestions).slice(0, 5).map(text => {
      const type = queryHistory.includes(text) ? 'history' : 'example';
      return { text, type };
    });
    
    return localSuggestions;
  }, [queryHistory, getCurrentLanguage]);
  
  // Smart suggestions system
  const getSmartSuggestions = useCallback(async (input: string) => {
    const localSuggestions = generateLocalSuggestions(input);
    
    if (!aiEnabled) {
      setSuggestions(localSuggestions);
      return;
    }

    setLoadingSuggestions(true);
    
    try {
      if (localSuggestions.length >= 3 || input.length < 4) {
        setSuggestions(localSuggestions);
        setLoadingSuggestions(false);
        return;
      }
      
      const response = await apiService.getSuggestions(
        input,
        true,
        queryHistory.slice(0, 5),
        getCurrentLanguage()
      );

      if (response.suggestions) {
        const apiSuggestions: Suggestion[] = response.suggestions.map((text: string) => ({
          text,
          type: 'suggestion' as const
        }));
        
        const combined = [...localSuggestions, ...apiSuggestions];
        const unique = combined.filter((suggestion, index, self) => 
          index === self.findIndex(s => s.text === suggestion.text)
        );
        
        setSuggestions(unique.slice(0, 7));
      } else {
        setSuggestions(localSuggestions);
      }
    } catch (error) {
      console.error('Suggestion error:', error);
      setSuggestions(localSuggestions);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [aiEnabled, queryHistory, generateLocalSuggestions, getCurrentLanguage]);
  
  // Spell checking
  const checkSpelling = useCallback(async (input: string) => {
    if (input.length < 4 || !aiEnabled) {
      setCorrection(null);
      return;
    }

    try {
      const response = await apiService.checkSpelling(input, getCurrentLanguage());
      
      if (response.correction && response.correction !== input) {
        setCorrection(response.correction);
      } else {
        setCorrection(null);
      }
    } catch (error) {
      console.error('Spell check error:', error);
      setCorrection(null);
    }
  }, [aiEnabled, getCurrentLanguage]);
  
  // Debounced functions
  const debouncedGetSuggestions = useMemo(
    () => debounce(getSmartSuggestions, 300),
    [getSmartSuggestions]
  );
  
  const debouncedCheckSpelling = useMemo(
    () => debounce(checkSpelling, 800),
    [checkSpelling]
  );
  
  // Query change handler
  const handleQueryChange = (text: string) => {
    setQuery(text);
    
    if (text.length >= 2) {
      debouncedGetSuggestions(text);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    
    debouncedCheckSpelling(text);
  };
  
  // Suggestion selection
  const handleSuggestionSelect = (suggestion: Suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    textInputRef.current?.focus();
  };
  
  // Apply correction
  const applyCorrection = () => {
    if (correction) {
      setQuery(correction);
      setCorrection(null);
      handleQueryChange(correction);
    }
  };
  
  // Complex query detection
  const isComplexQuery = (text: string): boolean => {
    const complexPatterns = [
      'tüm', 'hepsi', 'karşılaştır', 'kıyasla', 'trend', 
      'tüm acenteler', 'tüm ürünler', 'detaylı', 'kapsamlı'
    ];
    
    return complexPatterns.some(pattern => 
      text.toLowerCase().includes(pattern.toLowerCase())
    );
  };
  
  // Form submission
  const handleSubmit = async () => {
    if (!query.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir sorgu girin.');
      return;
    }
    
    const complexQuery = isComplexQuery(query);
    setTimeoutWarning(complexQuery);
    
    // Add to history
    const newHistory = [query, ...queryHistory.filter(q => q !== query)].slice(0, 20);
    setQueryHistory(newHistory);
    await AsyncStorage.setItem('queryHistory', JSON.stringify(newHistory));
    
    setLoading(true);
    setShowSuggestions(false);
    Keyboard.dismiss();
    
    try {
      const results = await apiService.executeQuery(query.trim(), getCurrentLanguage());
      onQuerySubmit(query, results);
    } catch (error: any) {
      let errorMessage = error.message || 'Sorgu çalıştırılırken bir hata oluştu';
      
      if (error.code === 'TOKEN_EXPIRED' || error.message.includes('Oturum süresi doldu')) {
        errorMessage = 'Oturum süresi doldu. Lütfen tekrar giriş yapın.';
      }
      
      onError(errorMessage);
    } finally {
      setLoading(false);
      setTimeoutWarning(false);
    }
  };
  
  // Clear form
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    setCorrection(null);
    setTimeoutWarning(false);
    
    if (onClearResults) {
      onClearResults();
    }
    
    textInputRef.current?.focus();
  };
  
  // Clear cache
  const handleClearCache = async () => {
    Alert.alert(
      'Uyarı',
      'Tüm sorgu önbelleği temizlenecek. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet',
          onPress: async () => {
            try {
              await apiService.clearCache();
              Alert.alert('Başarılı', 'Önbellek başarıyla temizlendi.');
            } catch (error: any) {
              Alert.alert('Hata', 'Önbellek temizlenemedi: ' + error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="search" size={20} color="#667eea" />
          <Text style={styles.headerTitle}>Sorgu Girişi</Text>
        </View>
        <View style={styles.headerRight}>
          <Ionicons 
            name={aiEnabled ? "sparkles" : "sparkles-outline"} 
            size={18} 
            color={aiEnabled ? "#667eea" : "#9CA3AF"} 
          />
          <Text style={[styles.aiStatus, !aiEnabled && styles.aiStatusDisabled]}>
            {aiEnabled ? 'AI Aktif' : 'AI Kapalı'}
          </Text>
        </View>
      </View>

      {/* Spell Correction */}
      {correction && (
        <View style={styles.correctionContainer}>
          <Ionicons name="bulb" size={16} color="#F59E0B" />
          <Text style={styles.correctionText}>
            Şunu mu demek istediniz: <Text style={styles.correctionSuggestion}>{correction}</Text>?
          </Text>
          <TouchableOpacity style={styles.correctionButton} onPress={applyCorrection}>
            <Text style={styles.correctionButtonText}>Evet, Düzelt</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Timeout Warning */}
      {timeoutWarning && (
        <View style={styles.warningContainer}>
          <Ionicons name="warning" size={16} color="#DC2626" />
          <Text style={styles.warningText}>
            <Text style={styles.warningLabel}>Uyarı:</Text> Bu sorgu uzun sürebilir. Lütfen bekleyin...
          </Text>
        </View>
      )}

      {/* Query Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>
          <Ionicons name="search" size={16} color="#374151" />
          {' '}Arama
          {loadingSuggestions && (
            <Text style={styles.loadingText}>
              {' '}Yükleniyor...
            </Text>
          )}
        </Text>
        
        <View style={styles.inputWrapper}>
          <TextInput
            ref={textInputRef}
            style={styles.textInput}
            placeholder="Örn: 2024 yılında en çok prim üreten acenteler"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={handleQueryChange}
            onFocus={() => {
              if (suggestions.length > 0 && query.length >= 2) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 300);
            }}
            multiline
            maxLength={500}
            editable={!loading}
          />
          
          {query.length > 0 && !loading && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <Text style={styles.suggestionsTitle}>
              {query.trim() ? 'Öneriler' : 'Öneri Listesi'}
            </Text>
            <ScrollView style={styles.suggestionsList} showsVerticalScrollIndicator={false}>
              {suggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={`suggestion-${index}`}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionSelect(suggestion)}
                  activeOpacity={0.7}
                >
                  <View style={styles.suggestionContent}>
                    <View style={[
                      styles.suggestionIcon,
                      suggestion.type === 'history' ? styles.historyIcon :
                      suggestion.type === 'example' ? styles.exampleIcon :
                      styles.suggestionIconDefault
                    ]}>
                      <Ionicons 
                        name={
                          suggestion.type === 'history' ? 'time' :
                          suggestion.type === 'example' ? 'bulb' :
                          'search'
                        } 
                        size={14} 
                        color={
                          suggestion.type === 'history' ? '#8B5CF6' :
                          suggestion.type === 'example' ? '#F59E0B' :
                          '#3B82F6'
                        }
                      />
                    </View>
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {suggestion.text}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={14} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Örnek Sorgular - Query boşken göster */}
        {!query.trim() && (
          <View style={styles.exampleQueriesSection}>
            <Text style={styles.exampleQueriesTitle}>💡 Örnek Sorgular</Text>
            <View style={styles.exampleQueriesList}>
              {[
                "2024 yılında en çok prim üreten 5 acente",
                "Son 6 ayda Kasko ürünü için aylık prim trendi çiz",
                "İstanbul'daki toplam poliçeleri göster",
                "Hangi ürünlerin hasar/prim oranı %50'nin altında?",
                "Acentelerin yıllık üretim karşılaştırması"
              ].map((example, index) => (
                <TouchableOpacity
                  key={`example-${index}`}
                  style={styles.exampleQueryItem}
                  onPress={() => {
                    setQuery(example);
                    textInputRef.current?.focus();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.exampleQueryIcon}>
                    <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
                  </View>
                  <Text style={styles.exampleQueryText}>{example}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.inputHint}>
          <Ionicons name="information-circle" size={14} color="#6B7280" />
          {' '}
          {aiEnabled 
            ? 'AI önerileri aktif'
            : 'AI önerileri kapalı - Ayarlardan açabilirsiniz'
          }
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.clearAllButton} onPress={handleClear}>
          <Ionicons name="close" size={16} color="#6B7280" />
          <Text style={styles.clearAllButtonText}>Temizle</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.submitButton, (!query.trim() || loading) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!query.trim() || loading}
        >
          {loading ? (
            <View style={styles.loadingContent}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.submitButtonText}>Analiz Ediliyor...</Text>
            </View>
          ) : (
            <View style={styles.submitContent}>
              <Ionicons name="paper-plane" size={16} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Analiz Et</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiStatus: {
    fontSize: 12,
    color: '#667eea',
    marginLeft: 4,
    fontWeight: '500',
  },
  aiStatusDisabled: {
    color: '#9CA3AF',
  },
  correctionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  correctionText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
  },
  correctionSuggestion: {
    fontWeight: '600',
  },
  correctionButton: {
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  correctionButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  warningContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    fontSize: 14,
    color: '#991B1B',
    marginLeft: 8,
    flex: 1,
  },
  warningLabel: {
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: 'relative',
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
  suggestionsContainer: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 250,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyIcon: {
    backgroundColor: '#EDE9FE',
  },
  exampleIcon: {
    backgroundColor: '#FEF3C7',
  },
  suggestionIconDefault: {
    backgroundColor: '#DBEAFE',
  },
  suggestionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 18,
  },
  exampleQueriesSection: {
    marginTop: 16,
  },
  exampleQueriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  exampleQueriesList: {
    gap: 8,
  },
  exampleQueryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  exampleQueryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  exampleQueryText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 18,
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  clearAllButtonText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  loadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default QueryInput;