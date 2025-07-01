// src/services/apiService.ts - Web versiyonu ile tam uyumlu
import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';
import { getEnvironmentConfig, getEnvironmentInfo } from '../config/environment';

// Toast utilities for React Native (Alert-based)
const showErrorToast = (message: string) => {
  Alert.alert('Hata', message);
};

const showWarningToast = (message: string) => {
  Alert.alert('Uyarı', message);
};

const showInfoToast = (message: string) => {
  Alert.alert('Bilgi', message);
};

const showSuccessToast = (message: string) => {
  Alert.alert('Başarılı', message);
};

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
    // Placeholder config - gerçek config async olarak yüklenecek
    this.api = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  // Async initialization
  async initialize() {
    try {
      const config = await initializeApiConfig();
      
      this.baseURL = config.baseURL;
      
      // Axios instance'ı yeniden yapılandır
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
      throw error;
    }
  }

  private setupInterceptors() {
    // Request interceptor - token ekleme
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await SecureStore.getItemAsync('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          
          // Dil bilgisini ekle
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

    // Response interceptor - error handling
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await this.clearAuthData();
        }
        return Promise.reject(error);
      }
    );
  }

  // JWT Token'ı SecureStore'dan al
  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('token');
    } catch (error) {
      console.log('Token retrieval error:', error);
      return null;
    }
  }

  // Mevcut dili al - Web versiyonu ile aynı
  async getCurrentLanguage(): Promise<string> {
    try {
      const storedLang = await AsyncStorage.getItem('i18nextLng');
      if (storedLang && ['tr', 'en', 'de', 'es'].includes(storedLang)) {
        return storedLang;
      }
      return 'tr'; // Default
    } catch (error) {
      return 'tr';
    }
  }

  // Headers oluştur - Web versiyonu ile aynı
  async getHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'BiQuery-ReactNative/1.0.0 (Expo)',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Dil bilgisini ekle
    headers['Accept-Language'] = await this.getCurrentLanguage();
    
    return headers;
  }

  private async clearAuthData(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('token');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('username');
      await AsyncStorage.removeItem('role');
    } catch (error) {
      console.log('Clear auth data error:', error);
    }
  }

  // Enhanced error handling - Web versiyonu ile birebir aynı
  handleEnhancedError(error: any, options: any = {}): Error {
    // Backend'den gelen yapılandırılmış hataları işle
    if (error.response?.data?.error) {
      const errorData = error.response.data.error;
      
      // Backend'den gelen yapılandırılmış hata
      if (typeof errorData === 'object' && errorData.title && errorData.message) {
        // Yapılandırılmış hata mesajını göster
        const errorMessage = `${errorData.title}: ${errorData.message}`;
        
        // Hata tipine göre toast rengi - sessiz mod kontrolü
        if (!options.silent) {
          if (error.response.status >= 500) {
            showErrorToast(errorMessage);
          } else if (error.response.status >= 400) {
            showWarningToast(errorMessage);
          } else {
            showInfoToast(errorMessage);
          }
        }
        
        // Çözüm önerilerini console'a logla (geliştirici için)
        if (errorData.solutions && errorData.solutions.length > 0) {
          console.group('🔧 Çözüm Önerileri:');
          errorData.solutions.forEach((solution: string, index: number) => {
            console.log(`${index + 1}. ${solution}`);
          });
          console.groupEnd();
        }
        
        // Destek kodu varsa logla
        if (errorData.support_code) {
          console.log(`📞 Destek Kodu: ${errorData.support_code}`);
        }
        
        // Enhanced error object döndür
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
          showErrorToast(errorData);
        }
        return new Error(errorData);
      }
    }
    
    // Network hataları
    let message = 'Bilinmeyen bir hata oluştu';
    if (error.code === 'ECONNABORTED') {
      message = 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
    } else if (error.message === 'Network Error') {
      message = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
    } else {
      message = error.response?.data?.message || error.message || message;
    }
    
    if (!options.silent) {
      showErrorToast(message);
    }
    
    return new Error(message);
  }

  // Generic API çağrısı - Web versiyonu ile aynı
  async makeRequest(method: string, endpoint: string, data: any = null, options: any = {}): Promise<any> {
    try {
      // Initialize eğer henüz yapılmadıysa
      if (!this.baseURL) {
        await this.initialize();
      }

      const config: any = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: await this.getHeaders(),
        timeout: API_CONFIG?.timeout || 300000, // 5 dakika
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
      // Gelişmiş hata yönetimi
      const enhancedError = this.handleEnhancedError(error, options);
      
      // Özel hata durumları
      if ((enhancedError as any).code === 'SYS_001') {
        // API yüklenme hatası - kullanıcıya özel mesaj
        const sysError = new Error('Sistem yoğun. Lütfen 1-2 dakika bekleyip tekrar deneyin.');
        (sysError as any).code = 'SYS_001';
        (sysError as any).retryAfter = (enhancedError as any).retryAfter || 120;
        throw sysError;
      } else if ((enhancedError as any).code === 'TIME_001') {
        // Zaman aşımı hatası - kullanıcıya özel mesaj
        const timeError = new Error('Sorgu çok uzun sürdü. Daha spesifik bir sorgu deneyin.');
        (timeError as any).code = 'TIME_001';
        throw timeError;
      } else if ((enhancedError as any).code === 'NET_001') {
        // Bağlantı hatası
        const netError = new Error('Bağlantı sorunu. İnternet bağlantınızı kontrol edin.');
        (netError as any).code = 'NET_001';
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

  // Query Execution - Web versiyonu ile birebir aynı
  async executeQuery(query: string, language?: string): Promise<QueryResponse> {
    const formData = new FormData();
    formData.append('query', query);
    
    const currentLanguage = language || await this.getCurrentLanguage();
    formData.append('language', currentLanguage);
    
    try {
      console.log('🔍 Executing query:', query);
      console.log('🗣️ Language:', currentLanguage);
      console.log('📡 Full URL:', `${this.baseURL}/api/query/`);
      
      const headers = await this.getHeaders();
      
      // Web versiyonundaki gibi AYNI yapı - Backend redirect yapıyor, trailing slash ekleyelim
      const response = await this.api.post('/api/query/', formData, {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000, // Web versiyonundaki gibi 5 dakika
        maxRedirects: 5, // Redirect'leri takip et
        validateStatus: function (status) {
          return status >= 200 && status < 400; // 308'i de kabul et
        }
      });

      console.log('✅ Query response status:', response.status);
      console.log('✅ Query response data:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Query execution error:', error.message);
      
      // Web versiyonundaki gelişmiş hata yönetimi
      const enhancedError = this.handleEnhancedError(error, {
        position: "top-center", 
        autoClose: 6000
      });
      
      throw enhancedError;
    }
  }

  // Query Suggestions - Web versiyonu ile birebir aynı
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
        silent: true, // Web versiyonundaki gibi sessiz mod
        autoClose: 3000
      });
      
      return {
        suggestions: response.suggestions || [],
        success: true
      };
    } catch (error: any) {
      console.error('Öneri alma hatası:', error);
      
      // Web versiyonundaki fallback sistemi
      return {
        suggestions: await this.generateFallbackSuggestions(query, language),
        success: false,
        error: error.message
      };
    }
  }

  // Spell Check - Web versiyonu ile birebir aynı
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

  // Fallback Suggestions Generator - Web versiyonu ile birebir aynı
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

  // Örnek sorgular - Web versiyonu ile birebir aynı
  async getExamples(): Promise<any> {
    try {
      const currentLanguage = await this.getCurrentLanguage();
      const response = await this.get(`/api/query/examples?lang=${currentLanguage}`);
      return response;
    } catch (error) {
      console.warn('Örnek sorgular alınamadı:', error);
      
      // Fallback - local örnekler (web versiyonundaki gibi)
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
          timeout: 60000 // Excel için 1 dakika timeout
        }
      );
      
      // React Native'de file download farklı - şimdilik başarı mesajı döndür
      showSuccessToast('Excel dosyası hazırlandı. İndirme işlemi web versiyonunda desteklenmektedir.');
      
      return { success: true };
    } catch (error: any) {
      console.error('Excel indirme hatası:', error);
      this.handleEnhancedError(error);
      throw error;
    }
  }

  // Cache Clear - Web versiyonu ile aynı
  async clearCache(): Promise<any> {
    try {
      const response = await this.post('/api/query/clear-cache');
      showSuccessToast('Önbellek başarıyla temizlendi.');
      return response;
    } catch (error: any) {
      console.error('Cache temizleme hatası:', error);
      throw error;
    }
  }

  // AUTH API'leri - Web versiyonu ile uyumlu
  async login(username: string, password: string): Promise<ApiResponse> {
    try {
      console.log('Login fonksiyonu çağrıldı:', username);
      console.log('API isteği başlatılıyor...');
      console.log('Hedef URL:', `${this.baseURL}/api/auth/login`);
      
      const response = await this.post('/api/auth/login', {
        username,
        password
      });
      
      console.log('API yanıtı:', response);
      
      const { user, success, message, token } = response;
      
      if (success && user && token) {
        await SecureStore.setItemAsync('token', token);
        await AsyncStorage.setItem('username', user.username);
        await AsyncStorage.setItem('role', user.role || 'Standart');
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        
        return {
          success: true,
          user,
          token
        };
      }
      
      return {
        success: false,
        message: message || 'Giriş başarısız!'
      };
    } catch (error: any) {
      console.error('Login hatası:', error);
      
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || 'Sunucu hatası!'
        };
      }
      
      return {
        success: false,
        message: 'Bağlantı hatası! Lütfen internet bağlantınızı kontrol edin.'
      };
    }
  }

  async logout(): Promise<ApiResponse> {
    try {
      await this.get('/api/auth/logout');
      await this.clearAuthData();
      
      return {
        success: true,
        message: 'Oturum başarıyla kapatıldı.'
      };
    } catch (error: any) {
      console.error('Logout API hatası:', error);
      await this.clearAuthData();
      
      return {
        success: true,
        message: 'Çıkış yaparken bir hata oluştu'
      };
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

  // === ANALYSIS API'LERİ - Web versiyonu ile birebir aynı ===

  // Veri analizi başlatma - Web versiyonu ile tam uyumlu
  async startAnalysis(data: any[], analysisType: 'general' | 'anomaly' | 'forecast' | 'trends' = 'general', language?: string): Promise<any> {
    try {
      const currentLanguage = language || await this.getCurrentLanguage();
      
      console.log('=== API SERVICE ANALIZ BAŞLATILIYOR ===');
      console.log('Analiz başlatılıyor:', {
        dataLength: data.length,
        analysisType,
        language: currentLanguage
      });
      
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
      this.handleEnhancedError(error, {
        position: "top-center",
        autoClose: 8000
      });
      throw error;
    }
  }

  // Analiz durumu kontrol etme - Web versiyonu ile aynı
  async getAnalysisStatus(jobId: string): Promise<any> {
    try {
      console.log(`Analiz durumu kontrol ediliyor: ${jobId}`);
      
      const response = await this.get(`/api/analysis/status/${jobId}`);
      
      console.log('Analiz durum yanıtı:', response);
      return response;
    } catch (error: any) {
      console.error('Analiz durumu kontrol hatası:', error);
      
      // Gelişmiş hata yönetimi
      const enhancedError = this.handleEnhancedError(error, {
        position: "top-center",
        autoClose: 6000
      });
      
      throw enhancedError;
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
      
      const response = await this.post('/api/auth/validate-token');
      
      return {
        valid: true,
        user: response.user,
        message: 'Token geçerli'
      };
    } catch (error: any) {
      console.error('Token doğrulama hatası:', error);
      
      return {
        valid: false,
        message: 'Token doğrulama hatası!'
      };
    }
  }

  // Mevcut kullanıcı bilgilerini getir
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

  // Kimlik doğrulama durumunu kontrol et
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getToken();
      return token !== null;
    } catch (error) {
      return false;
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

  // Legacy compatibility için
  handleError(error: any) {
    console.warn('Deprecated: Use handleEnhancedError instead');
    return this.handleEnhancedError(error);
  }

  // checkAnalysisStatus - backward compatibility
  async checkAnalysisStatus(jobId: string): Promise<any> {
    return this.getAnalysisStatus(jobId);
  }
}

// Singleton instance oluştur ve export et
const apiService = new ApiService();
export default apiService;