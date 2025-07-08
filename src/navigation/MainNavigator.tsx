// src/navigation/MainNavigator.tsx - Fixed version
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from '../context/LanguageContext';
import ManualTabNavigator from './ManualTabNavigator';
import NotificationSettingsScreen from '../screens/MainScreens/NotificationSettingsScreen';
import { MainStackParamList } from './types';

const Stack = createStackNavigator<MainStackParamList>();

const MainNavigator: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F8FAFC' },
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
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
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          title: t('settings.notifications.title'),
          headerShown: true,
          headerStyle: {
            backgroundColor: '#ffffff',
            elevation: 2,
            shadowOpacity: 0.1,
          },
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
            color: '#1F2937',
          },
          headerTintColor: '#3B82F6',
          headerBackTitle: '',
        }}
      />
    </Stack.Navigator>
  );
};

export default MainNavigator;