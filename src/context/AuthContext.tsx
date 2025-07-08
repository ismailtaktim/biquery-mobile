import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import apiService from '../services/apiService';

interface User {
  username: string;
  role: string;
  hasToken: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  validateToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // App başlatıldığında kullanıcı durumunu kontrol et
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Checking auth state...');
      
      // Initialize API service first
      await apiService.initialize();
      
      const token = await SecureStore.getItemAsync('token');
      const username = await AsyncStorage.getItem('username');
      const role = await AsyncStorage.getItem('role');
      
      // Token ve username yoksa direkt login'e yönlendir
      if (!token || !username) {
        console.log('❌ No token or username found, redirecting to login');
        setUser(null);
        setIsLoading(false);
        return;
      }

      console.log('🔑 Token found for user:', username);
      
      // Token varsa validation yap
      try {
        console.log('🔍 Validating stored token...');
        const validation = await apiService.validateToken();
        
        if (validation.valid) {
          console.log('✅ Token is valid, auto-login successful');
          const userInfo: User = {
            username,
            role: role || 'Standart',
            hasToken: true
          };
          setUser(userInfo);
        } else {
          console.log('❌ Token expired/invalid, clearing data');
          await clearUserData();
        }
      } catch (tokenError) {
        console.log('❌ Token validation failed:', tokenError);
        // Token validation hatası durumunda sessizce temizle
        await clearUserDataSilently();
      }
    } catch (error) {
      console.error('🚨 Auth state check error:', error);
      // Genel hata durumunda sessizce temizle
      await clearUserDataSilently();
    } finally {
      setIsLoading(false);
      console.log('✅ Auth state check completed');
    }
  };

  const clearUserData = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('username');
      await AsyncStorage.removeItem('role');
      setUser(null);
      console.log('🗑️ User data cleared');
    } catch (error) {
      console.log('Clear user data error:', error);
    }
  };

  // Sessiz temizleme (hata logları olmadan)
  const clearUserDataSilently = async () => {
    try {
      await SecureStore.deleteItemAsync('token');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('username');
      await AsyncStorage.removeItem('role');
      setUser(null);
      console.log('🗑️ User data cleared (silent)');
    } catch (error) {
      // Sessiz hatalar
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      console.log('🔐 Attempting login for:', username);
      
      const response = await apiService.login(username, password);
      
      if (response.success && response.user && response.token) {
        await SecureStore.setItemAsync('token', response.token);
        await AsyncStorage.setItem('username', response.user.username);
        await AsyncStorage.setItem('role', response.user.role || 'Standart');
        await AsyncStorage.setItem('userData', JSON.stringify(response.user));
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const userInfo: User = {
          username: response.user.username,
          role: response.user.role || 'Standart',
          hasToken: true
        };
        
        setUser(userInfo);
        console.log('✅ Login successful for:', userInfo.username);
        return true;
      }
      
      console.log('❌ Login failed:', response.message);
      return false;
    } catch (error: any) {
      console.error('🚨 Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('🚪 Logging out...');
      
      // API logout'u optional yap - hata olsa bile devam et
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        try {
          await apiService.logout();
          console.log('✅ API logout successful');
        } catch (error) {
          console.log('⚠️ API logout failed, continuing with local logout:', error);
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Local data'yı temizle
      await SecureStore.deleteItemAsync('token');
      await AsyncStorage.removeItem('userData');
      await AsyncStorage.removeItem('username');
      await AsyncStorage.removeItem('role');
      
      setUser(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('🚨 Logout error:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const validateToken = async (): Promise<boolean> => {
    try {
      console.log('🔍 Manual token validation...');
      
      // Önce token varlığını kontrol et
      const token = await SecureStore.getItemAsync('token');
      if (!token) {
        console.log('❌ No token found for validation');
        await clearUserDataSilently();
        return false;
      }

      const validation = await apiService.validateToken();
      
      if (!validation.valid) {
        console.log('❌ Token invalid, logging out');
        await clearUserData();
        return false;
      }
      
      console.log('✅ Token valid');
      return true;
    } catch (error) {
      console.log('❌ Token validation error, clearing data:', error);
      await clearUserDataSilently();
      return false;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    validateToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};