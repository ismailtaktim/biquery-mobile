import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const { width, height } = Dimensions.get('window');

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const { t, currentLanguage } = useLanguage();
  const [isLanguageReady, setIsLanguageReady] = useState(false);

  // Component mount olduğunda dil yüklenmesini bekle
  useEffect(() => {
    const checkLanguageReady = () => {
      // Dil servisinin hazır olduğunu kontrol et
      if (currentLanguage) {
        setIsLanguageReady(true);
        console.log('🗣️ Login screen language ready:', currentLanguage);
      }
    };

    checkLanguageReady();

    // Küçük bir delay ile tekrar kontrol et (race condition için)
    const timer = setTimeout(checkLanguageReady, 100);
    
    return () => clearTimeout(timer);
  }, [currentLanguage]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('login.validation.required'));
      return;
    }

    const success = await login(email, password);
    
    if (!success) {
      Alert.alert(t('common.error'), t('login.errors.failed'));
    }
    // Başarılı olursa AuthContext otomatik olarak Dashboard'a yönlendirecek
  };

  // Dil hazır değilse loading göster
  if (!isLanguageReady) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2', '#3b82f6']}
        style={[styles.container, styles.centerContent]}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#3b82f6']}
      style={styles.container}
    >
      {/* Background Animated Shapes */}
      <View style={styles.backgroundShapes}>
        <View style={[styles.shape, styles.shape1]} />
        <View style={[styles.shape, styles.shape2]} />
        <View style={[styles.shape, styles.shape3]} />
      </View>

      {/* Language Indicator - Sadece debug için, kaldırılabilir */}
      {__DEV__ && (
        <View style={styles.languageIndicator}>
          <Text style={styles.languageIndicatorText}>
            🗣️ {currentLanguage.toUpperCase()}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <Text style={styles.logoText}>BiQuery</Text>
            <View style={styles.betaBadge}>
              <Text style={styles.betaText}>BETA</Text>
            </View>
            <Text style={styles.subtitle}>{t('login.info.titleLine2')}</Text>
          </View>

          {/* Example Queries */}
          <View style={styles.exampleSection}>
            <Text style={styles.exampleTitle}>{t('dashboard.examples.title')}</Text>
            <Text style={styles.exampleQuery}>• {t('login.examples.query1')}</Text>
            <Text style={styles.exampleQuery}>• {t('login.examples.query2')}</Text>
            <Text style={styles.exampleQuery}>• {t('login.examples.query3')}</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>{t('login.title')}</Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('login.username')}
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('login.password')}
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>{t('login.loginButton')}</Text>
              )}
            </TouchableOpacity>

            {/* Demo Credentials */}
            <View style={styles.demoSection}>
              <Text style={styles.demoTitle}>{t('login.demo.title')}</Text>
              <Text style={styles.demoText}>Email: test@biquery.com</Text>
              <Text style={styles.demoText}>{t('login.password')}: 123456</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
  },
  languageIndicator: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 10,
  },
  languageIndicatorText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  backgroundShapes: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  shape: {
    position: 'absolute',
    borderRadius: 20,
    opacity: 0.1,
  },
  shape1: {
    width: 200,
    height: 200,
    backgroundColor: '#ffffff',
    top: '10%',
    left: '-10%',
    transform: [{ rotate: '45deg' }],
  },
  shape2: {
    width: 150,
    height: 150,
    backgroundColor: '#ffffff',
    top: '60%',
    right: '-10%',
    transform: [{ rotate: '30deg' }],
  },
  shape3: {
    width: 100,
    height: 100,
    backgroundColor: '#ffffff',
    top: '30%',
    right: '20%',
    transform: [{ rotate: '60deg' }],
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  betaBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  betaText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#e2e8f0',
    marginTop: 12,
    textAlign: 'center',
  },
  exampleSection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  exampleTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  exampleQuery: {
    color: '#e2e8f0',
    fontSize: 14,
    marginBottom: 8,
    paddingLeft: 8,
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 30,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
  },
  loginButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  demoSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
});

export default LoginScreen;