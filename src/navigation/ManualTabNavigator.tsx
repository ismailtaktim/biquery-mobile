// src/navigation/ManualTabNavigator.tsx - Fixed version with proper imports and error handling
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../context/LanguageContext';
import DashboardScreen from '../screens/MainScreens/DashboardScreen';
import QueryScreen from '../screens/MainScreens/QueryScreen';
import LanguageButton from '../components/common/LanguageButton';

type TabName = 'Dashboard' | 'Query';

interface TabConfig {
  name: TabName;
  icon: string; // Changed from keyof typeof Ionicons.glyphMap to string for better compatibility
  component: React.ComponentType;
  labelKey: string;
}

const ManualTabNavigator: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabName>('Dashboard');

  const tabs: TabConfig[] = [
    {
      name: 'Dashboard',
      icon: 'home-outline',
      component: DashboardScreen,
      labelKey: 'navigation.dashboard'
    },
    {
      name: 'Query',
      icon: 'search-outline',
      component: QueryScreen,
      labelKey: 'navigation.query'
    }
  ];

  const renderContent = () => {
    const activeTabConfig = tabs.find(tab => tab.name === activeTab);
    if (!activeTabConfig) {
      // Fallback to Dashboard if active tab not found
      console.warn('Active tab not found, falling back to Dashboard');
      const Component = DashboardScreen;
      return <Component />;
    }

    const Component = activeTabConfig.component;
    return <Component />;
  };

  const getActiveIcon = (tabIcon: string): string => {
    // Convert outline icons to filled versions when active
    if (tabIcon.includes('-outline')) {
      return tabIcon.replace('-outline', '');
    }
    return tabIcon;
  };

  const renderTab = (tab: TabConfig) => {
    const isActive = activeTab === tab.name;
    const iconName = isActive ? getActiveIcon(tab.icon) : tab.icon;
    
    return (
      <TouchableOpacity
        key={tab.name}
        style={[styles.tab, isActive && styles.activeTab]}
        onPress={() => setActiveTab(tab.name)}
        activeOpacity={0.7}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={t(tab.labelKey)}
      >
        <Ionicons
          name={iconName as any} // Type assertion for icon compatibility
          size={24}
          color={isActive ? '#3B82F6' : '#6B7280'}
        />
        <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
          {t(tab.labelKey)}
        </Text>
        {isActive && <View style={styles.activeIndicator} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Bottom Tab Bar */}
      <SafeAreaView style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          <View style={styles.tabsContainer}>
            {tabs.map(renderTab)}
          </View>
          
          {/* Language Button in Tab Bar */}
          <View style={styles.languageContainer}>
            <LanguageButton variant="icon-only" />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 60,
  },
  tabsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    position: 'relative',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#EBF4FF',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 20,
    height: 3,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
  languageContainer: {
    marginLeft: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ManualTabNavigator;