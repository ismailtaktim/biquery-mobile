// src/navigation/AppNavigator.tsx - Fixed version with proper error handling
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/LanguageContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  console.log('🧭 AppNavigator rendering, authenticated:', isAuthenticated, 'loading:', isLoading);

  // Show loading state while auth is being checked
  if (isLoading) {
    return null; // Or you can return a loading screen component
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen 
            name="Main" 
            component={MainNavigator}
            options={{ 
              title: t('navigation.dashboard'),
              headerShown: false
            }}
          />
        ) : (
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator}
            options={{ 
              title: t('auth.login'),
              headerShown: false
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;