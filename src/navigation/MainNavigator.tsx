// src/navigation/MainNavigator.tsx - Fixed version
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from '../context/LanguageContext';
import ManualTabNavigator from './ManualTabNavigator';
import { MainStackParamList } from './types';

const Stack = createStackNavigator<MainStackParamList>();

const MainNavigator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' }
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={ManualTabNavigator}
        options={{
          title: t('navigation.dashboard'),
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;