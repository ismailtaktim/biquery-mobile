import Toast from 'react-native-toast-message';
import { i18n } from './i18n';

export interface ToastOptions {
  duration?: number;
  position?: 'top' | 'bottom';
  topOffset?: number;
  bottomOffset?: number;
}

export const showSuccessToast = (messageKey: string, options: ToastOptions = {}, params?: { [key: string]: string | number }) => {
  Toast.show({
    type: 'success',
    text1: i18n.t('toast.success.title'),
    text2: i18n.t(messageKey, params),
    visibilityTime: options.duration || 3000,
    position: options.position || 'top',
    topOffset: options.topOffset || 60,
    bottomOffset: options.bottomOffset || 40,
  });
};

export const showErrorToast = (messageKey: string, options: ToastOptions = {}, params?: { [key: string]: string | number }) => {
  Toast.show({
    type: 'error',
    text1: i18n.t('toast.error.title'),
    text2: i18n.t(messageKey, params),
    visibilityTime: options.duration || 4000,
    position: options.position || 'top',
    topOffset: options.topOffset || 60,
    bottomOffset: options.bottomOffset || 40,
  });
};

export const showWarningToast = (messageKey: string, options: ToastOptions = {}, params?: { [key: string]: string | number }) => {
  Toast.show({
    type: 'info',
    text1: i18n.t('toast.warning.title'),
    text2: i18n.t(messageKey, params),
    visibilityTime: options.duration || 3000,
    position: options.position || 'top',
    topOffset: options.topOffset || 60,
    bottomOffset: options.bottomOffset || 40,
  });
};

export const showInfoToast = (messageKey: string, options: ToastOptions = {}, params?: { [key: string]: string | number }) => {
  Toast.show({
    type: 'info',
    text1: i18n.t('toast.info.title'),
    text2: i18n.t(messageKey, params),
    visibilityTime: options.duration || 3000,
    position: options.position || 'top',
    topOffset: options.topOffset || 60,
    bottomOffset: options.bottomOffset || 40,
  });
};

// Custom toast - daha fazla kontrol için
export const showCustomToast = (
  titleKey: string,
  messageKey: string,
  type: 'success' | 'error' | 'info' = 'info',
  options: ToastOptions = {},
  params?: { [key: string]: string | number }
) => {
  Toast.show({
    type,
    text1: i18n.t(titleKey, params),
    text2: i18n.t(messageKey, params),
    visibilityTime: options.duration || 3000,
    position: options.position || 'top',
    topOffset: options.topOffset || 60,
    bottomOffset: options.bottomOffset || 40,
  });
};

// Direct message toast (backward compatibility + emergency use)
export const showDirectToast = (
  title: string,
  message: string,
  type: 'success' | 'error' | 'info' = 'info',
  options: ToastOptions = {}
) => {
  Toast.show({
    type,
    text1: title,
    text2: message,
    visibilityTime: options.duration || 3000,
    position: options.position || 'top',
    topOffset: options.topOffset || 60,
    bottomOffset: options.bottomOffset || 40,
  });
};

// API için özel toast'lar - dil destekli
export const showApiToast = {
  loading: (messageKey = 'toast.api.loading') => {
    showInfoToast(messageKey, { duration: 2000 });
  },
  success: (messageKey = 'toast.api.success', params?: { [key: string]: string | number }) => {
    showSuccessToast(messageKey, {}, params);
  },
  error: (messageKey = 'toast.api.error') => {
    showErrorToast(messageKey);
  },
  unauthorized: () => {
    showErrorToast('toast.api.unauthorized');
  },
  forbidden: () => {
    showErrorToast('toast.api.forbidden');
  },
  notFound: () => {
    showErrorToast('toast.api.notFound');
  },
  serverError: () => {
    showErrorToast('toast.api.serverError');
  },
  networkError: () => {
    showErrorToast('toast.api.networkError');
  },
  timeout: () => {
    showErrorToast('toast.api.timeout');
  }
};

// Network durumu için - dil destekli
export const showNetworkToast = {
  offline: () => showErrorToast('toast.network.offline'),
  online: () => showSuccessToast('toast.network.online'),
  slow: () => showWarningToast('toast.network.slow')
};

// Analysis için özel toast'lar - dil destekli
export const showAnalysisToast = {
  starting: (analysisType?: string) => {
    showInfoToast('toast.analysis.starting', { duration: 2000 }, { type: analysisType || 'genel' });
  },
  completed: (analysisType?: string) => {
    showSuccessToast('toast.analysis.completed', {}, { type: analysisType || 'analiz' });
  },
  failed: (analysisType?: string) => {
    showErrorToast('toast.analysis.failed', {}, { type: analysisType || 'analiz' });
  },
  insufficientData: () => {
    showWarningToast('toast.analysis.insufficientData');
  },
  timeout: () => {
    showErrorToast('toast.analysis.timeout');
  }
};

// Query için özel toast'lar - dil destekli
export const showQueryToast = {
  success: (count: number) => {
    showSuccessToast('toast.query.success', {}, { count: count.toString() });
  },
  noResults: () => {
    showWarningToast('toast.query.noResults');
  },
  error: () => {
    showErrorToast('toast.query.error');
  },
  executing: () => {
    showInfoToast('toast.query.executing', { duration: 2000 });
  },
  timeout: () => {
    showErrorToast('toast.query.timeout');
  }
};

// Authentication için özel toast'lar - dil destekli
export const showAuthToast = {
  loginSuccess: (username: string) => {
    showSuccessToast('toast.auth.loginSuccess', {}, { username });
  },
  loginError: () => {
    showErrorToast('toast.auth.loginError');
  },
  logoutSuccess: () => {
    showSuccessToast('toast.auth.logoutSuccess');
  },
  sessionExpired: () => {
    showErrorToast('toast.auth.sessionExpired');
  },
  invalidCredentials: () => {
    showErrorToast('toast.auth.invalidCredentials');
  }
};

// Speech to text için - dil destekli
export const showSpeechToast = {
  listening: () => {
    showInfoToast('toast.speech.listening', { duration: 1500 });
  },
  recognized: () => {
    showSuccessToast('toast.speech.recognized');
  },
  error: () => {
    showErrorToast('toast.speech.error');
  },
  noSupport: () => {
    showErrorToast('toast.speech.noSupport');
  }
};

// Language change için - dil destekli
export const showLanguageToast = {
  changed: (language: string) => {
    showSuccessToast('toast.language.changed', {}, { language });
  },
  changing: () => {
    showInfoToast('toast.language.changing', { duration: 1500 });
  }
};

// Toast'ı gizle
export const hideToast = () => {
  Toast.hide();
};