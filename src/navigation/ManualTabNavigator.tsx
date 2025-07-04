// src/navigation/ManualTabNavigator.tsx - Single Dashboard (No Language Button)
import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import DashboardScreen from '../screens/MainScreens/DashboardScreen';

const ManualTabNavigator: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Main Content - Only Dashboard */}
      <View style={styles.content}>
        <DashboardScreen />
      </View>
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
});

export default ManualTabNavigator;