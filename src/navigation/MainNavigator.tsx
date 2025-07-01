// src/navigation/MainNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList, MainStackParamList } from './types';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Screens
import DashboardScreen from '../screens/MainScreens/DashboardScreen';
import QueryScreen from '../screens/MainScreens/QueryScreen';

// Debug wrapper for QueryScreen
const DebugQueryScreen = () => {
  console.log('🔥 DebugQueryScreen rendering...');
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 10, backgroundColor: '#FF0000' }}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>🔥 DEBUG: QUERY SCREEN MOUNTED</Text>
      </View>
      <QueryScreen />
    </View>
  );
};

// Debug wrapper for Dashboard
const DebugDashboardScreen = () => {
  console.log('🔥 DebugDashboardScreen rendering...');
  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 10, backgroundColor: '#00FF00' }}>
        <Text style={{ color: 'white', fontWeight: 'bold' }}>🔥 DEBUG: DASHBOARD MOUNTED</Text>
      </View>
      <DashboardScreen />
    </View>
  );
};

const AgentsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Acenteler Screen</Text>
  </View>
);

const ProductsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Ürünler Screen</Text>
  </View>
);

const RegionalScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Bölgesel Screen</Text>
  </View>
);

const ComparisonsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Karşılaştır Screen</Text>
  </View>
);

const ReportsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Raporlar Screen</Text>
  </View>
);

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<MainStackParamList>();

const MainTabs: React.FC = () => {
  console.log('🔥 MainTabs rendering...');
  
  // Tab Navigator'ın çalışıp çalışmadığını test edelim
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route, navigation }) => {
        console.log('🔥 screenOptions called for:', route.name);
        
        return {
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            console.log('🔥 tabBarIcon rendering for:', route.name, 'focused:', focused);
            
            let iconName: keyof typeof Ionicons.glyphMap;

            switch (route.name) {
              case 'Dashboard':
                iconName = focused ? 'home' : 'home-outline';
                break;
              case 'Query':
                iconName = focused ? 'search' : 'search-outline';
                break;
              case 'Agents':
                iconName = focused ? 'people' : 'people-outline';
                break;
              case 'Products':
                iconName = focused ? 'cube' : 'cube-outline';
                break;
              case 'Regional':
                iconName = focused ? 'map' : 'map-outline';
                break;
              case 'Comparisons':
                iconName = focused ? 'analytics' : 'analytics-outline';
                break;
              case 'Reports':
                iconName = focused ? 'document-text' : 'document-text-outline';
                break;
              default:
                iconName = 'home-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#64748b',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e2e8f0',
            paddingTop: 8,
            paddingBottom: 8,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        };
      }}
      screenListeners={({ route, navigation }) => ({
        tabPress: (e) => {
          console.log('🔥 Tab pressed:', route.name);
        },
        focus: (e) => {
          console.log('🔥 Tab focused:', route.name);
        },
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DebugDashboardScreen}
        options={{ tabBarLabel: 'Dashboard' }}
        listeners={{
          tabPress: () => console.log('🔥 Dashboard tab pressed'),
          focus: () => console.log('🔥 Dashboard focused'),
        }}
      />
      <Tab.Screen 
        name="Query" 
        component={DebugQueryScreen}
        options={{ tabBarLabel: 'Sorgula' }}
        listeners={{
          tabPress: () => console.log('🔥 Query tab pressed'),
          focus: () => console.log('🔥 Query focused'),
        }}
      />
      <Tab.Screen 
        name="Agents" 
        component={AgentsScreen}
        options={{ tabBarLabel: 'Acenteler' }}
      />
      <Tab.Screen 
        name="Products" 
        component={ProductsScreen}
        options={{ tabBarLabel: 'Ürünler' }}
      />
      <Tab.Screen 
        name="Regional" 
        component={RegionalScreen}
        options={{ tabBarLabel: 'Bölgesel' }}
      />
      <Tab.Screen 
        name="Comparisons" 
        component={ComparisonsScreen}
        options={{ tabBarLabel: 'Karşılaştır' }}
      />
      <Tab.Screen 
        name="Reports" 
        component={ReportsScreen}
        options={{ tabBarLabel: 'Raporlar' }}
      />
    </Tab.Navigator>
  );
};

import ManualTabNavigator from './ManualTabNavigator';

const MainNavigator: React.FC = () => {
  console.log('🔥 MainNavigator rendering...');
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={ManualTabNavigator} />
    </Stack.Navigator>
  );
};

export default MainNavigator;