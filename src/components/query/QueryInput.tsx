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
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const inputRef = useRef<TextInput>(null);
  const suggestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Örnek sorgular
  const exampleQueries = [
    "2024 yılında en çok prim üreten 5 acente",
    "Son 6 ayda Kasko ürünü için aylık prim trendi çiz",
    "İstanbul'daki toplam poliçeleri göster",
    "Hangi ürünlerin hasar/prim oranı %50'nin altında?",
    "Acentelerin yıllık üretim karşılaştırması"
  ];

  // Component mount olduğunda örnek sorguları yükle
  useEffect(() => {
    loadExampleQueries();
  }, []);

  const loadExampleQueries = async () => {
    try {
      const response = await apiService.getExamples();
      const examples = response?.examples || [];
      
      if (examples && examples.length > 0) {
        const exampleSuggestions: Suggestion[] = examples.map((query: string) => ({
          text: query,
          type: 'example' as const
        }));
        setSuggestions(exampleSuggestions);
      } else {
        const fallbackSuggestions: Suggestion[] = exampleQueries.map(query => ({
          text: query,
          type: 'example' as const
        }));
        setSuggestions(fallbackSuggestions);
      }
    } catch (error) {
      const fallbackSuggestions: Suggestion[] = exampleQueries.map(query => ({
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
        const suggestionResponse = await apiService.getSuggestions(searchText);
        const suggestionResults = suggestionResponse?.suggestions || [];
        
        if (suggestionResults && suggestionResults.length > 0) {
          const newSuggestions: Suggestion[] = suggestionResults.map((suggestion: string) => ({
            text: suggestion,
            type: 'suggestion' as const
          }));
          setSuggestions(newSuggestions);
        } else {
          const exampleSuggestions: Suggestion[] = exampleQueries
            .filter(example => example.toLowerCase().includes(searchText.toLowerCase()))
            .map(query => ({
              text: query,
              type: 'example' as const
            }));
          setSuggestions(exampleSuggestions);
        }
        setShowSuggestions(true);
      } catch (error) {
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
      Alert.alert('Uyarı', 'Lütfen bir sorgu girin.');
      return;
    }

    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const results = await apiService.executeQuery(query);
      // Web versiyonunda history yok, sadece results göster
      onQuerySubmit(query, results);
    } catch (error: any) {
      let errorMessage = error.message || 'Sorgu çalıştırılırken bir hata oluştu';
      
      // Token expired özel mesajı
      if (error.code === 'TOKEN_EXPIRED' || error.message.includes('Oturum süresi doldu')) {
        errorMessage = 'Oturum süresi doldu. Sayfayı yenileyin ve tekrar giriş yapın.';
        
        // 2 saniye sonra logout'a yönlendir
        setTimeout(() => {
          Alert.alert(
            'Oturum Süresi Doldu',
            'Güvenlik nedeniyle oturumunuz sonlandırıldı. Tekrar giriş yapmanız gerekiyor.',
            [
              {
                text: 'Tekrar Giriş Yap',
                onPress: () => {
                  // AuthContext'ten logout çağır - implement edilecek
                  console.log('🔐 Redirecting to login...');
                }
              }
            ]
          );
        }, 2000);
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

  return (
    <View style={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroContent}>
          <Text style={styles.heroTitle}>Verilerinizi Keşfedin</Text>
          <Text style={styles.heroSubtitle}>
            Doğal dilde sorun, anında analiz alın
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
              placeholder="Örn: 2024 yılında en çok prim üreten acenteler"
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
                <Text style={styles.searchButtonText}>Analiz Ediliyor...</Text>
              </View>
            ) : (
              <View style={styles.searchButtonContent}>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                <Text style={styles.searchButtonText}>Analiz Et</Text>
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
              AI sorgunuzu analiz ediyor ve SQL oluşturuyor...
            </Text>
          </View>
        )}
      </View>

      {/* Suggestions Section */}
      {!isLoading && showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsTitle}>
            {query.trim() ? 'Öneriler' : 'Örnek Sorgular'}
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
});

export default QueryInput;