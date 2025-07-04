// src/services/apiService.ts - Tam dil destekli toast entegrasyonu
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getEnvironmentConfig, getEnvironmentInfo } from '../config/environment';
import { 
  showApiToast, 
  showNetworkToast, 
  showAuthToast,
  showQueryToast,
  showAnalysisToast,
  showCustomToast,
  showDirectToast
} from '../utils/toastUtils';

// Environment-based configuration
let API_CONFIG: any = null;

const initializeApiConfig = async () => {
  if (!API_CONFIG) {
    const envConfig = await getEnvironmentConfig();
    API_CONFIG = envConfig.api;
    
    if (envConfig.enableLogging) {
      const envInfo = await getEnvironmentInfo();
      console.log('🔧 API Configuration Initialized:', envInfo);
    }
  }
  return API_CONFIG;
};

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  user?: any;
  token?: string;
}

interface QueryResponse {
  success: boolean;
  sql?: string;
  data?: any[];
  columns?: string[];
  total_rows?: number;
  execution_time?: number;
  message?: string;
  error?: string;
}

class ApiService {
  private api: AxiosInstance;
  public baseURL: string = '';

  constructor() {
    this.api = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  async initialize() {
    try {
      const config = await initializeApiConfig();
      
      this.baseURL = config.baseURL;
      
      this.api = axios.create({
        baseURL: config.baseURL,
        timeout: config.timeout,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.setupInterceptors();
      
      console.log(`🌐 API Service initialized: ${config.description}`);
      console.log(`📡 Base URL: ${config.baseURL}`);
      
      if (config.requiresVPN) {
        console.log('🔒 VPN connection required for this environment');
      }
    } catch (error) {
      console.error('❌ API Service initialization failed:', error);
      showApiToast.error('toast.api.initializationFailed');
      throw error;
    }
  }

  private setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await SecureStore.getItemAsync('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          
          const language = await this.getCurrentLanguage();
          config.headers['Accept-Language'] = language;
          config.headers['User-Agent'] = 'BiQuery-ReactNative/1.0.0 (Expo)';
        } catch (error) {
          console.log('Token retrieval error:', error);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - dil destekli toast'lar
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Token süresi dolmuş
        if (error.response?.status === 401) {
          console.log('🔒 Token expired, clearing auth data...');
          await this.clearAuthData();
          
          // CSRF hatası değilse toast göster
          if (!error.response?.data?.message?.includes('CSRF')) {
            showApiToast.unauthorized();
          }
          
          return Promise.reject(error);
        }

        // Network hatası
        if (error.code === 'NETWORK_ERROR' || !error.response) {
          showNetworkToast.offline();
          return Promise.reject(error);
        }

        // Sunucu hatası
        if (error.response?.status >= 500) {
          showApiToast.serverError();
          return Promise.reject(error);
        }

        // Rate limit
        if (error.response?.status === 429) {
          showCustomToast('toast.warning.title', 'toast.api.rateLimited', 'info');
          return Promise.reject(error);
        }

        // Forbidden
        if (error.response?.status === 403) {
          showApiToast.forbidden();
          return Promise.reject(error);
        }

        // Not found
        if (error.response?.status === 404) {
          showApiToast.notFound();
          return Promise.reject(error);
        }

        return Promise.reject(error);
      }
    );
  }

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('token');
    } catch (error) {
      console.log('Token retrieval error:', error);
      return null;
    }
  }

  async getCurrentLanguage(): Promise<string> {
    try {
      const storedLang = await AsyncStorage.getItem('i18nextLng');
      if (storedLang && ['tr', 'en', 'de', 'es'].includes(storedLang)) {
        return storedLang;
      }
      return 'tr';
    } catch (error) {
      return 'tr';
    }
  }

  async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'BiQuery-ReactNative/1.0.0 (Expo)',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    headers['Accept-Language'] = await this.getCurrentLanguage();
    
    return headers;
  }

  private async clearAuthData(): Promise<void> {
    try {
      console.log('🧹 Clearing authentication data...');
      
      await SecureStore.deleteItemAsync('token');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('username');
      await AsyncStorage.removeItem('role');
      
      console.log('✅ Authentication data cleared successfully');
    } catch (error) {
      console.log('⚠️ Error clearing auth data:', error);
    }
  }

  // Enhanced error handling - dil destekli
  handleEnhancedError(error: any, options: any = {}): Error {
    if (error.response?.data?.error) {
      const errorData = error.response.data.error;
      
      // Backend'den gelen yapılandırılmış hata
      if (typeof errorData === 'object' && errorData.title && errorData.message) {
        const errorMessage = `${errorData.title}: ${errorData.message}`;
        
        if (!options.silent) {
          if (error.response.status >= 500) {
            showApiToast.serverError();
          } else if (error.response.status === 403) {
            showApiToast.forbidden();
          } else if (error.response.status === 404) {
            showApiToast.notFound();
          } else {
            // Backend'den gelen custom error - direct göster
            showDirectToast(errorData.title, errorData.message, 'error');
          }
        }
        
        // Çözüm önerilerini console'a logla
        if (errorData.solutions && errorData.solutions.length > 0) {
          console.group('🔧 Çözüm Önerileri:');
          errorData.solutions.forEach((solution: string, index: number) => {
            console.log(`${index + 1}. ${solution}`);
          });
          console.groupEnd();
        }
        
        const enhancedError = new Error(errorMessage);
        (enhancedError as any).code = errorData.error_code;
        (enhancedError as any).supportCode = errorData.support_code;
        (enhancedError as any).solutions = errorData.solutions;
        (enhancedError as any).retryAfter = error.response.data.retry_after;
        (enhancedError as any).isEnhanced = true;
        
        return enhancedError;
      }
      
      // Eski format string hata
      if (typeof errorData === 'string') {
        if (!options.silent) {
          showApiToast.error('toast.api.error');
        }
        return new Error(errorData);
      }
    }
    
    // Network hataları için dil destekli toast'lar
    if (!options.silent) {
      if (error.code === 'ECONNABORTED') {
        showApiToast.timeout();
      } else if (error.message === 'Network Error') {
        showApiToast.networkError();
      } else {
        showApiToast.error('toast.api.error');
      }
    }
    
    return new Error(error.response?.data?.message || error.message || 'Unknown error');
  }

  async makeRequest(method: string, endpoint: string, data: any = null, options: any = {}): Promise<any> {
    try {
      if (!this.baseURL) {
        await this.initialize();
      }

      const config: any = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: await this.getHeaders(),
        timeout: API_CONFIG?.timeout || 300000,
        ...options
      };

      if (data) {
        if (method.toLowerCase() === 'get') {
          config.params = data;
        } else {
          config.data = data;
        }
      }

      const response = await axios(config);
      return response.data;
    } catch (error: any) {
      const enhancedError = this.handleEnhancedError(error, options);
      
      // Özel hata durumları - dil destekli toast'lar
      if ((enhancedError as any).code === 'SYS_001') {
        const sysError = new Error('Sistem yoğun. Lütfen 1-2 dakika bekleyip tekrar deneyin.');
        (sysError as any).code = 'SYS_001';
        (sysError as any).retryAfter = (enhancedError as any).retryAfter || 120;
        showCustomToast('toast.error.title', 'toast.api.systemBusy', 'error');
        throw sysError;
      } else if ((enhancedError as any).code === 'TIME_001') {
        const timeError = new Error('Sorgu çok uzun sürdü. Daha spesifik bir sorgu deneyin.');
        (timeError as any).code = 'TIME_001';
        showQueryToast.timeout();
        throw timeError;
      } else if ((enhancedError as any).code === 'NET_001') {
        const netError = new Error('Bağlantı sorunu. İnternet bağlantınızı kontrol edin.');
        (netError as any).code = 'NET_001';
        showNetworkToast.offline();
        throw netError;
      }
      
      throw enhancedError;
    }
  }

  // CRUD Operations
  async get(endpoint: string, params: any = {}, options: any = {}): Promise<any> {
    return this.makeRequest('GET', endpoint, params, options);
  }
  
  async post(endpoint: string, data: any = {}, options: any = {}): Promise<any> {
    return this.makeRequest('POST', endpoint, data, options);
  }
  
  async put(endpoint: string, data: any = {}, options: any = {}): Promise<any> {
    return this.makeRequest('PUT', endpoint, data, options);
  }
  
  async delete(endpoint: string, options: any = {}): Promise<any> {
    return this.makeRequest('DELETE', endpoint, null, options);
  }

  // Query Execution - dil destekli toast'lar
  async executeQuery(query: string, language?: string): Promise<QueryResponse> {
    const formData = new FormData();
    formData.append('query', query);
    
    const currentLanguage = language || await this.getCurrentLanguage();
    formData.append('language', currentLanguage);
    
    try {
      console.log('🔍 Executing query:', query);
      console.log('🗣️ Language:', currentLanguage);
      
      // Query başlatma bildirimi
      showQueryToast.executing();
      
      const headers = await this.getHeaders();
      
      const response = await this.api.post('/api/query/', formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000,
        maxRedirects: 5,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        }
      });

      console.log('✅ Query executed successfully');
      
      // Sonuç toast'ı
      if (response.data.data && response.data.data.length > 0) {
        showQueryToast.success(response.data.data.length);
      } else {
        showQueryToast.noResults();
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Query execution error:', error.message);
      
      // Query hatası toast'ları
      if (error.code === 'ECONNABORTED') {
        showQueryToast.timeout();
      } else {
        showQueryToast.error();
      }
      
      throw error;
    }
  }

  // Query Suggestions - dil destekli
  async getSuggestions(query: string, includeHistory: boolean = true, history: string[] = [], language?: string): Promise<any> {
    try {
      const currentLanguage = language || await this.getCurrentLanguage();
      
      const response = await this.post('/api/query/suggestions', {
        query: query.trim(),
        includeHistory,
        history,
        language: currentLanguage,
        maxSuggestions: 7
      }, {
        silent: true, // Öneri hatalarında toast gösterme
        autoClose: 3000
      });
      
      return {
        suggestions: response.suggestions || [],
        success: true
      };
    } catch (error: any) {
      console.error('Öneri alma hatası:', error);
      
      return {
        suggestions: await this.generateFallbackSuggestions(query, language),
        success: false,
        error: error.message
      };
    }
  }

  // Spell Check - dil destekli
  async checkSpelling(query: string, language?: string): Promise<any> {
    try {
      const currentLanguage = language || await this.getCurrentLanguage();
      
      const response = await this.post('/api/query/spellcheck', {
        query: query.trim(),
        language: currentLanguage
      }, {
        silent: true,
        autoClose: 2000
      });
      
      return {
        correction: response.correction || null,
        confidence: response.confidence || 0,
        suggestions: response.suggestions || [],
        success: true
      };
    } catch (error: any) {
      console.error('Yazım kontrolü hatası:', error);
      
      return {
        correction: null,
        confidence: 0,
        suggestions: [],
        success: false,
        error: error.message
      };
    }
  }

  // Fallback Suggestions Generator
  async generateFallbackSuggestions(query: string, language?: string): Promise<string[]> {
    const fallbackSuggestions = {
      'tr': [
        'en yüksek prim üreten 5 acente',
        'son 6 ayda aylık prim trendi',
        'toplam poliçe sayısı',
        'hasarlı poliçeler analizi',
        'bölgesel performans karşılaştırması'
      ],
      'en': [
        'top 5 agents with highest premium',
        'monthly premium trend in last 6 months',
        'total policy count',
        'claims analysis',
        'regional performance comparison'
      ],
      'de': [
        'die 5 Agenturen mit der höchsten Prämie',
        'monatlicher Prämientrend in den letzten 6 Monaten',
        'Gesamtzahl der Policen',
        'Schadenanalyse',
        'regionaler Leistungsvergleich'
      ],
      'es': [
        'los 5 agentes con mayor prima',
        'tendencia mensual de primas en los últimos 6 meses',
        'número total de pólizas',
        'análisis de siniestros',
        'comparación de rendimiento regional'
      ]
    };
    
    const currentLang = language || await this.getCurrentLanguage();
    return fallbackSuggestions[currentLang as keyof typeof fallbackSuggestions] || fallbackSuggestions['tr'];
  }

  // Cache Clear - dil destekli
  async clearCache(): Promise<any> {
    try {
      const response = await this.post('/api/query/clear-cache');
      showApiToast.success('toast.api.cacheCleared');
      return response;
    } catch (error: any) {
      console.error('Cache temizleme hatası:', error);
      throw error;
    }
  }

  // AUTH API'leri - dil destekli toast'lar
  async login(username: string, password: string): Promise<ApiResponse> {
    try {
      console.log('🔐 Login attempt for:', username);
      
      const response = await this.post('/api/auth/login', {
        username,
        password
      });
      
      const { user, success, message, token } = response;
      
      if (success && user && token) {
        await SecureStore.setItemAsync('token', token);
        await AsyncStorage.setItem('username', user.username);
        await AsyncStorage.setItem('role', user.role || 'Standart');
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        
        // Kişiselleştirilmiş hoş geldin mesajı
        showAuthToast.loginSuccess(user.username);
        
        return {
          success: true,
          user,
          token
        };
      }
      
      // Giriş başarısız
      showAuthToast.loginError();
      return {
        success: false,
        message: message || 'Login failed'
      };
    } catch (error: any) {
      console.error('Login hatası:', error);
      
      // Hata türüne göre toast
      if (error.response?.status === 401) {
        showAuthToast.invalidCredentials();
      } else if (error.response?.status >= 500) {
        showApiToast.serverError();
      } else if (!error.response) {
        showNetworkToast.offline();
      } else {
        showAuthToast.loginError();
      }
      
      return {
        success: false,
        message: error.response?.data?.message || 'Bağlantı hatası!'
      };
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      await this.get('/api/auth/logout');
      await this.clearAuthData();
      
      showAuthToast.logoutSuccess();
      
      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error: any) {
      console.error('Logout API hatası:', error);
      await this.clearAuthData();
      
      // Logout'ta hata olsa bile çıkış yapılır
      showAuthToast.logoutSuccess();
      
      return {
        success: true,
        message: 'Logout completed'
      };
    }
  }

  // Analysis API'leri - dil destekli toast'lar
  async startAnalysis(data: any[], analysisType: 'general' | 'anomaly' | 'forecast' | 'trends' = 'general', language?: string): Promise<any> {
    try {
      const currentLanguage = language || await this.getCurrentLanguage();
      
      // Analiz tipleri çevirisi
      const analysisTypeNames = {
        'general': 'Genel',
        'anomaly': 'Anomali',
        'forecast': 'Tahmin',
        'trends': 'Trend'
      };
      
      console.log('=== API SERVICE ANALIZ BAŞLATILIYOR ===');
      console.log('Analiz başlatılıyor:', {
        dataLength: data.length,
        analysisType,
        language: currentLanguage
      });
      
      // Başlatma toast'ı
      showAnalysisToast.starting(analysisTypeNames[analysisType]);
      
      const formData = new FormData();
      formData.append('data', JSON.stringify(data));
      formData.append('analysis_type', analysisType);
      formData.append('language', currentLanguage);
      
      const response = await this.api.post('/api/analysis/start', formData, {
        headers: {
          ...(await this.getHeaders()),
          'Content-Type': 'multipart/form-data'
        }
      });
      
      console.log('Analiz başlatma yanıtı:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Analiz başlatma hatası:', error);
      
      // Analiz tipleri çevirisi (catch block'ta da tanımla)
      const analysisTypeNames = {
        'general': 'Genel',
        'anomaly': 'Anomali',
        'forecast': 'Tahmin',
        'trends': 'Trend'
      };
      
      // Analiz hata toast'ları
      if (error.response?.data?.error_code === 'INSUFFICIENT_DATA') {
        showAnalysisToast.insufficientData();
      } else if (error.code === 'ECONNABORTED') {
        showAnalysisToast.timeout();
      } else {
        showAnalysisToast.failed(analysisTypeNames[analysisType]);
      }
      
      throw error;
    }
  }

  // Analiz durumu kontrol etme
  async getAnalysisStatus(jobId: string): Promise<any> {
    try {
      console.log(`Analiz durumu kontrol ediliyor: ${jobId}`);
      
      const response = await this.get(`/api/analysis/status/${jobId}`);
      
      console.log('Analiz durum yanıtı:', response);
      return response;
    } catch (error: any) {
      console.error('Analiz durumu kontrol hatası:', error);
      
      // Status kontrol hatası için sessiz mod
      const enhancedError = this.handleEnhancedError(error, {
        silent: true // Status kontrolde toast gösterme
      });
      
      throw enhancedError;
    }
  }

  // Set Language - Web versiyonu ile aynı
  async setLanguage(language: string): Promise<any> {
    try {
      const response = await this.post('/api/auth/set-language', {
        language
      });
      
      if (response.success) {
        await AsyncStorage.setItem('i18nextLng', language);
      }
      
      return response;
    } catch (error: any) {
      console.error('Dil değiştirme hatası:', error);
      throw error;
    }
  }

  // Token doğrulama
  async validateToken(): Promise<any> {
    try {
      const token = await this.getToken();
      
      if (!token) {
        return {
          valid: false,
          message: 'Token bulunamadı!'
        };
      }
      
      const response = await this.post('/api/auth/validate-token', {}, {
        silent: true // Token validation'da toast gösterme
      });
      
      return {
        valid: true,
        user: response.user,
        message: 'Token geçerli'
      };
    } catch (error: any) {
      console.error('Token doğrulama hatası:', error);
      
      // CSRF hatası özel durumu
      if (error.response?.data?.message?.includes('CSRF')) {
        console.log('🔒 CSRF token error detected, clearing auth data silently...');
        await this.clearAuthData();
        
        return {
          valid: false,
          message: 'CSRF token geçersiz',
          shouldRedirectToLogin: true
        };
      }
      
      // Diğer 401 hataları için toast göster
      if (error.response?.status === 401) {
        showAuthToast.sessionExpired();
        await this.clearAuthData();
      }
      
      return {
        valid: false,
        message: error.response?.data?.message || 'Token doğrulama hatası!'
      };
    }
  }

  // Diğer eksik fonksiyonlar

  // Örnek sorgular - Web versiyonu ile birebir aynı
  async getExamples(): Promise<any> {
    try {
      const currentLanguage = await this.getCurrentLanguage();
      const response = await this.get(`/api/query/examples?lang=${currentLanguage}`);
      return response;
    } catch (error) {
      console.warn('Örnek sorgular alınamadı:', error);
      
      // Fallback - local örnekler
      const fallbackExamples = {
        'tr': [
          '2024 yılında en çok prim üreten 5 acente',
          'Son 6 ayda Kasko ürünü için aylık prim trendi çiz',
          'İstanbul\'daki toplam poliçeleri göster',
          'En çok hasarlı acente hangisi?',
          'Motor sigortasında ortalama prim tutarı nedir?'
        ],
        'en': [
          'Top 5 agents with highest premium production in 2024',
          'Draw monthly premium trend for Motor products in last 6 months',
          'Show total policies in Istanbul',
          'Which agent has the most claims?',
          'What is the average premium amount in motor insurance?'
        ],
        'de': [
          'Top 5 Agenturen mit höchster Prämienproduktion in 2024',
          'Zeichne monatlichen Prämientrend für Kfz-Produkte in den letzten 6 Monaten',
          'Zeige Gesamtpolicen in Istanbul',
          'Welche Agentur hat die meisten Schäden?',
          'Wie hoch ist die durchschnittliche Prämie in der Kfz-Versicherung?'
        ],
        'es': [
          'Top 5 agentes con mayor producción de primas en 2024',
          'Dibujar tendencia mensual de primas para productos de Motor en los últimos 6 meses',
          'Mostrar total de pólizas en Estambul',
          '¿Qué agente tiene más siniestros?',
          '¿Cuál es el monto promedio de prima en seguros de motor?'
        ]
      };
      
      const currentLanguage = await this.getCurrentLanguage();
      return { examples: fallbackExamples[currentLanguage as keyof typeof fallbackExamples] || fallbackExamples['tr'] };
    }
  }

  // Excel Download - React Native için uyarlanmış
  async downloadExcel(data: any): Promise<any> {
    try {
      const response = await this.api.post('/api/query/download-excel', 
        { data }, 
        { 
          responseType: 'blob',
          headers: await this.getHeaders(),
          timeout: 60000
        }
      );
      
      // React Native'de file download farklı
      showApiToast.success('toast.api.excelReady');
      
      return { success: true };
    } catch (error: any) {
      console.error('Excel indirme hatası:', error);
      this.handleEnhancedError(error);
      throw error;
    }
  }

  // Analiz sonucu alma
  async getAnalysisResult(jobId: string): Promise<any> {
    try {
      console.log('🔍 Getting analysis result:', jobId);
      
      const response = await this.get(`/api/analysis/result/${jobId}`);
      
      console.log('✅ Analysis result:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Analysis result error:', error);
      this.handleEnhancedError(error);
      throw error;
    }
  }

  // Analiz iptal etme
  async cancelAnalysis(jobId: string): Promise<any> {
    try {
      console.log('🔍 Cancelling analysis:', jobId);
      
      const response = await this.post(`/api/analysis/cancel/${jobId}`);
      
      console.log('✅ Analysis cancelled:', response);
      return response;
    } catch (error: any) {
      console.error('❌ Analysis cancel error:', error);
      this.handleEnhancedError(error);
      throw error;
    }
  }

  // Analiz geçmişi
  async getAnalysisHistory(limit: number = 10): Promise<any> {
    try {
      const response = await this.get('/api/analysis/history', { limit });
      return response.analyses || [];
    } catch (error: any) {
      console.error('❌ Analysis history error:', error);
      return [];
    }
  }

  // Recent Queries
  async getRecentQueries(): Promise<any[]> {
    try {
      const response = await this.get('/api/query/recent');
      return response.queries || [];
    } catch (error) {
      console.warn('Recent queries yüklenemedi');
      
      // Local storage'dan al
      try {
        const historyString = await AsyncStorage.getItem('queryHistory');
        return historyString ? JSON.parse(historyString) : [];
      } catch {
        return [];
      }
    }
  }

  // Diğer fonksiyonlar aynı kalacak...
  async getCurrentUser(): Promise<any> {
    try {
      const username = await AsyncStorage.getItem('username');
      const role = await AsyncStorage.getItem('role');
      const token = await this.getToken();
      
      if (username && token) {
        return {
          username,
          role: role || 'Standart',
          hasToken: !!token
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getToken();
      return token !== null;
    } catch (error) {
      return false;
    }
  }

  // Legacy compatibility
  handleError(error: any) {
    console.warn('Deprecated: Use handleEnhancedError instead');
    return this.handleEnhancedError(error);
  }

  async checkAnalysisStatus(jobId: string): Promise<any> {
    return this.getAnalysisStatus(jobId);
  }
}

// Singleton instance
const apiService = new ApiService();
export default apiService;