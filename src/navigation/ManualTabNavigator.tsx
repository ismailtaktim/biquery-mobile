// src/navigation/ManualTabNavigator.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/MainScreens/DashboardScreen';
import QueryScreen from '../screens/MainScreens/QueryScreen';

const ManualTabNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Agents' | 'Products' | 'Regional' | 'Comparisons' | 'Reports'>('Dashboard');

  console.log('🔥 ManualTabNavigator rendering, activeTab:', activeTab);

  const tabs = [
    { key: 'Dashboard', label: 'Dashboard', icon: 'home' },
    { key: 'Agents', label: 'Acenteler', icon: 'people' },
    { key: 'Products', label: 'Ürünler', icon: 'cube' },
    { key: 'Regional', label: 'Bölgesel', icon: 'map' },
    { key: 'Comparisons', label: 'Karşılaştır', icon: 'analytics' },
    { key: 'Reports', label: 'Raporlar', icon: 'document-text' },
  ] as const;

  const renderScreen = () => {
    console.log('🔥 Rendering screen for:', activeTab);
    
    switch (activeTab) {
      case 'Dashboard':
        return <DashboardScreen />;
      case 'Agents':
        return (
          <View style={styles.placeholderScreen}>
            <Text style={styles.placeholderText}>Acenteler Screen</Text>
          </View>
        );
      case 'Products':
        return (
          <View style={styles.placeholderScreen}>
            <Text style={styles.placeholderText}>Ürünler Screen</Text>
          </View>
        );
      case 'Regional':
        return (
          <View style={styles.placeholderScreen}>
            <Text style={styles.placeholderText}>Bölgesel Screen</Text>
          </View>
        );
      case 'Comparisons':
        return (
          <View style={styles.placeholderScreen}>
            <Text style={styles.placeholderText}>Karşılaştır Screen</Text>
          </View>
        );
      case 'Reports':
        return (
          <View style={styles.placeholderScreen}>
            <Text style={styles.placeholderText}>Raporlar Screen</Text>
          </View>
        );
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Screen Content */}
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      {/* Custom Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={() => {
                console.log('🔥 Tab pressed:', tab.key);
                setActiveTab(tab.key as any);
              }}
            >
              <Ionicons 
                name={isActive ? tab.icon : `${tab.icon}-outline`} 
                size={24} 
                color={isActive ? '#3b82f6' : '#64748b'} 
              />
              <Text style={[
                styles.tabLabel,
                { color: isActive ? '#3b82f6' : '#64748b' }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    paddingBottom: 8,
    height: 60,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  placeholderScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  placeholderText: {
    fontSize: 18,
    color: '#6B7280',
  },
});

export default ManualTabNavigator;