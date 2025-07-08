// src/screens/AuthScreens/LoginScreen.tsx - No language selector
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { withLanguage } from '../../hoc/withLanguage';

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();
  const { t, language } = useTranslation();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Demo credentials based on language
  const getDemoCredentials = () => {
    const demoData = {
      tr: { username: 'demo', password: 'demo123', title: 'Demo Hesabı' },
      en: { username: 'demo', password: 'demo123', title: 'Demo Account' },
      de: { username: 'demo', password: 'demo123', title: 'Demo-Konto' },
      es: { username: 'demo', password: 'demo123', title: 'Cuenta Demo' }
    };
    return demoData[language as keyof typeof demoData] || demoData.tr;
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert(
        t('common.warning'),
        t('auth.loginError'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const success = await login(username.trim(), password);
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.message || t('auth.loginError'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoCredentials = () => {
    const demo = getDemoCredentials();
    setUsername(demo.username);
    setPassword(demo.password);
  };

  const getExampleQueries = () => {
    const examples = {
      tr: [
        'Son 3 aydaki satış raporu',
        'En başarılı acenteler',
        'Bölgesel performans analizi'
      ],
      en: [
        'Sales report for the last 3 months',
        'Top performing agents',
        'Regional performance analysis'
      ],
      de: [
        'Verkaufsbericht der letzten 3 Monate',
        'Leistungsstärkste Vertreter',
        'Regionale Leistungsanalyse'
      ],
      es: [
        'Informe de ventas de los últimos 3 meses',
        'Agentes con mejor rendimiento',
        'Análisis de rendimiento regional'
      ]
    };
    return examples[language as keyof typeof examples] || examples.tr;
  };

  // Dil göstergesi (sadece görsel, tıklanamaz)
  const getLanguageDisplay = () => {
    const displays = {
      tr: '🇹🇷 Türkçe',
      en: '🇺🇸 English',
      de: '🇩🇪 Deutsch',
      es: '🇪🇸 Español'
    };
    return displays[language as keyof typeof displays] || displays.tr;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.background}
      >
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Language Display (read-only) */}
            <View style={styles.languageDisplay}>
              <Text style={styles.languageText}>{getLanguageDisplay()}</Text>
            </View>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Ionicons name="analytics" size={60} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>{t('login.title')}</Text>
              <Text style={styles.subtitle}>{t('login.info.titleLine2')}</Text>
            </View>

            {/* Login Form */}
            <View style={styles.formContainer}>
              <View style={styles.card}>
                {/* Username Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#6B7280" />
                  <TextInput
                    style={styles.input}
                    placeholder={t('login.username')}
                    placeholderTextColor="#9CA3AF"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting && !isLoading}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#6B7280" />
                  <TextInput
                    style={styles.input}
                    placeholder={t('login.password')}
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting && !isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                </View>

                {/* Demo Credentials */}
                <TouchableOpacity 
                  style={styles.demoButton}
                  onPress={fillDemoCredentials}
                  disabled={isSubmitting || isLoading}
                >
                  <Ionicons name="flash" size={16} color="#3B82F6" />
                  <Text style={styles.demoButtonText}>
                    {getDemoCredentials().title}
                  </Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    (isSubmitting || isLoading) && styles.loginButtonDisabled
                  ]}
                  onPress={handleLogin}
                  disabled={isSubmitting || isLoading}
                >
                  {(isSubmitting || isLoading) ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.loginButtonText}>
                        {t('common.loading')}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.loginButtonText}>
                      {t('login.loginButton')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Example Queries */}
            <View style={styles.examplesContainer}>
              <Text style={styles.examplesTitle}>
                {t('dashboard.examples.title')}
              </Text>
              
              {getExampleQueries().map((query, index) => (
                <View key={index} style={styles.exampleItem}>
                  <Ionicons name="bulb-outline" size={16} color="#E2E8F0" />
                  <Text style={styles.exampleText}>{query}</Text>
                </View>
              ))}
            </View>

            {/* Footer Info */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {t('login.info.titleLine2')}
              </Text>
              <Text style={styles.versionText}>
                v1.0.0 • BiQuery Mobile
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  languageDisplay: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  languageText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E2E8F0',
    textAlign: 'center',
    opacity: 0.9,
  },
  formContainer: {
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 12,
  },
  eyeButton: {
    padding: 4,
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF4FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  demoButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  examplesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  examplesTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  exampleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  exampleText: {
    color: '#E2E8F0',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  footerText: {
    color: '#E2E8F0',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 4,
  },
  versionText: {
    color: '#E2E8F0',
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.6,
  },
});

// Export with language HOC for automatic language loading
export default withLanguage(LoginScreen);