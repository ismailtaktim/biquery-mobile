// src/context/LanguageContext.tsx - Enhanced with better state management
import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode, 
  useCallback,
  useMemo 
} from 'react';
import { Alert } from 'react-native';
import { i18n, SupportedLanguage, LanguageMetadata, SUPPORTED_LANGUAGES } from '../utils/i18n';
import apiService from '../services/apiService';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  currentLanguageMetadata: LanguageMetadata;
  supportedLanguages: LanguageMetadata[];
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  t: (key: string, params?: { [key: string]: string | number }) => string;
  isLoading: boolean;
  isChangingLanguage: boolean;
  hasUserManuallySelected: boolean;
  error: string | null;
  retryInitialization: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('tr');
  const [isLoading, setIsLoading] = useState(true);
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [hasUserManuallySelected, setHasUserManuallySelected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized values to prevent unnecessary re-renders
  const currentLanguageMetadata = useMemo(
    () => SUPPORTED_LANGUAGES.find(lang => lang.code === currentLanguage) || SUPPORTED_LANGUAGES[0],
    [currentLanguage]
  );

  const supportedLanguages = useMemo(() => SUPPORTED_LANGUAGES, []);

  // Initialize language system
  const initializeLanguage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🚀 Starting language initialization...');
      
      // Initialize i18n service
      await i18n.init();
      
      // Get current language from i18n service
      const detectedLanguage = i18n.getLanguage();
      setCurrentLanguage(detectedLanguage);
      
      // Check if user has manually selected language
      const hasManualSelection = await i18n.hasUserManuallySelectedLanguage();
      setHasUserManuallySelected(hasManualSelection);
      
      console.log('✅ Language initialization complete:', {
        language: detectedLanguage,
        hasManualSelection,
        metadata: currentLanguageMetadata
      });
      
    } catch (error) {
      console.error('🚨 Language initialization error:', error);
      setError('Language initialization failed');
      
      // Fallback to Turkish
      setCurrentLanguage('tr');
      setHasUserManuallySelected(false);
    } finally {
      setIsLoading(false);
    }
  }, [currentLanguageMetadata]);

  // Change language function with improved error handling
  const changeLanguage = useCallback(async (language: SupportedLanguage) => {
    if (language === currentLanguage) {
      console.log('🔄 Language already set to:', language);
      return;
    }

    try {
      setIsChangingLanguage(true);
      setError(null);
      console.log('🔄 Changing language to:', language);
      
      // Validate language
      const isSupported = SUPPORTED_LANGUAGES.some(lang => lang.code === language);
      if (!isSupported) {
        throw new Error(`Unsupported language: ${language}`);
      }
      
      // Update i18n service
      await i18n.setLanguage(language, true);
      
      // Update local state
      setCurrentLanguage(language);
      setHasUserManuallySelected(true);
      
      // Notify API service about language change
      try {
        await apiService.setLanguage(language);
        console.log('✅ Language updated on server');
      } catch (apiError) {
        console.warn('⚠️ Failed to update language on server:', apiError);
        // Don't fail the language change if API call fails
      }
      
      console.log('✅ Language successfully changed to:', language);
      
    } catch (error: any) {
      console.error('🚨 Language change error:', error);
      setError(`Failed to change language: ${error.message}`);
      
      // Show user-friendly error
      Alert.alert(
        'Language Change Failed',
        'Could not change language. Please try again.',
        [{ text: 'OK' }]
      );
      
      throw error; // Re-throw for component error handling
    } finally {
      setIsChangingLanguage(false);
    }
  }, [currentLanguage]);

  // Translation function with error handling
  const t = useCallback((key: string, params?: { [key: string]: string | number }) => {
    try {
      if (!i18n.isReady()) {
        console.warn('⚠️ i18n not ready, returning key:', key);
        return key;
      }
      
      return i18n.t(key, params);
    } catch (error) {
      console.error('🚨 Translation error for key:', key, error);
      return key;
    }
  }, []);

  // Retry initialization function
  const retryInitialization = useCallback(async () => {
    console.log('🔄 Retrying language initialization...');
    await initializeLanguage();
  }, [initializeLanguage]);

  // Initialize on mount
  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  // Handle language changes from outside (e.g., system language change)
  useEffect(() => {
    const handleAppStateChange = async () => {
      // Only auto-detect if user hasn't manually selected a language
      if (!hasUserManuallySelected) {
        try {
          const systemLanguage = i18n.getLanguage();
          if (systemLanguage !== currentLanguage) {
            console.log('🔄 System language changed, updating...');
            setCurrentLanguage(systemLanguage);
          }
        } catch (error) {
          console.warn('⚠️ Failed to check system language change:', error);
        }
      }
    };

    // You might want to add app state change listener here
    // AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      // AppState.removeEventListener('change', handleAppStateChange);
    };
  }, [currentLanguage, hasUserManuallySelected]);

  // Create context value with memoization to prevent unnecessary re-renders
  const contextValue = useMemo<LanguageContextType>(() => ({
    currentLanguage,
    currentLanguageMetadata,
    supportedLanguages,
    changeLanguage,
    t,
    isLoading,
    isChangingLanguage,
    hasUserManuallySelected,
    error,
    retryInitialization,
  }), [
    currentLanguage,
    currentLanguageMetadata,
    supportedLanguages,
    changeLanguage,
    t,
    isLoading,
    isChangingLanguage,
    hasUserManuallySelected,
    error,
    retryInitialization,
  ]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

// Enhanced hook with better error handling
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error(
      'useLanguage must be used within a LanguageProvider. ' +
      'Make sure your component is wrapped with <LanguageProvider>.'
    );
  }
  
  return context;
};

// Helper hook for components that only need translation function
export const useTranslation = () => {
  const { t, currentLanguage, isLoading } = useLanguage();
  
  return useMemo(() => ({
    t,
    language: currentLanguage,
    isLoading,
  }), [t, currentLanguage, isLoading]);
};

// Helper hook for language selection components
export const useLanguageSelection = () => {
  const { 
    currentLanguage, 
    supportedLanguages, 
    changeLanguage, 
    isChangingLanguage,
    error 
  } = useLanguage();
  
  return useMemo(() => ({
    currentLanguage,
    supportedLanguages,
    changeLanguage,
    isChangingLanguage,
    error,
  }), [currentLanguage, supportedLanguages, changeLanguage, isChangingLanguage, error]);
};