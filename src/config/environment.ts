// src/config/environment.ts
import { Platform } from 'react-native';

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  requiresVPN: boolean;
  description: string;
}

export interface EnvironmentConfig {
  api: ApiConfig;
  environment: 'development' | 'staging' | 'production';
  enableLogging: boolean;
  enableNetworkInspector: boolean;
}

// Network detection utility
export const detectNetworkEnvironment = async (): Promise<'corporate' | 'external' | 'local'> => {
  try {
    // Önce şirket ağını test et
    const corporateResponse = await fetch('http://10.146.23.254:5001/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    
    if (corporateResponse.ok) {
      return 'corporate';
    }
  } catch {
    // Corporate network başarısız
  }

  try {
    // Local development ağını test et
    const localResponse = await fetch('http://192.168.1.7:5001/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    
    if (localResponse.ok) {
      return 'local';
    }
  } catch {
    // Local network başarısız
  }

  // Hiçbiri çalışmazsa external varsay
  return 'external';
};

// Environment configurations
const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  development: {
    api: {
      baseURL: 'http://192.168.1.7:5001',  // Local development
      timeout: 30000,
      requiresVPN: false,
      description: 'Local Development Server'
    },
    environment: 'development',
    enableLogging: true,
    enableNetworkInspector: true
  },

  staging: {
    api: {
      baseURL: 'http://10.146.23.254:5001',  // Corporate network via VPN
      timeout: 45000,
      requiresVPN: true,
      description: 'Corporate Network (VPN Required)'
    },
    environment: 'staging',
    enableLogging: true,
    enableNetworkInspector: false
  },

  production: {
    api: {
      baseURL: 'https://biquery-api.internal.mapfre.net',  // Production domain
      timeout: 60000,
      requiresVPN: true,
      description: 'Production Internal API'
    },
    environment: 'production',
    enableLogging: false,
    enableNetworkInspector: false
  }
};

// Dynamic environment detection
export const getEnvironmentConfig = async (): Promise<EnvironmentConfig> => {
  // Build type check
  if (__DEV__) {
    // Development mode - network'e göre karar ver
    const networkType = await detectNetworkEnvironment();
    
    switch (networkType) {
      case 'corporate':
        console.log('🏢 Corporate network detected - using staging config');
        return ENVIRONMENTS.staging;
        
      case 'local':
        console.log('🏠 Local network detected - using development config');
        return ENVIRONMENTS.development;
        
      default:
        console.log('🌐 External network detected - using development config with warning');
        return {
          ...ENVIRONMENTS.development,
          api: {
            ...ENVIRONMENTS.development.api,
            description: 'External Network - VPN may be required'
          }
        };
    }
  } else {
    // Production build - daima production config
    console.log('🚀 Production build detected');
    return ENVIRONMENTS.production;
  }
};

// Manual environment override (for testing)
export const getEnvironmentConfigByName = (envName: keyof typeof ENVIRONMENTS): EnvironmentConfig => {
  return ENVIRONMENTS[envName] || ENVIRONMENTS.development;
};

// Environment info for debugging
export const getEnvironmentInfo = async () => {
  const config = await getEnvironmentConfig();
  const networkType = await detectNetworkEnvironment();
  
  return {
    platform: Platform.OS,
    isDebugMode: __DEV__,
    networkType,
    apiBaseURL: config.api.baseURL,
    requiresVPN: config.api.requiresVPN,
    environment: config.environment,
    description: config.api.description,
    loggingEnabled: config.enableLogging
  };
};