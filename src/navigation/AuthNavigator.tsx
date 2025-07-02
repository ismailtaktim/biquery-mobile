// src/navigation/AuthNavigator.tsx - Fixed version
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from '../context/LanguageContext';
import LoginScreen from '../screens/AuthScreens/LoginScreen';
import { AuthStackParamList } from './types';

const Stack = createStackNavigator<AuthStackParamList>();

const AuthNavigator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FFFFFF' }
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: t('auth.login'),
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;