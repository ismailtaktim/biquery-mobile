// App.tsx - Enhanced with better language management
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { withLanguageLoader } from './src/hoc/withLanguage';

// Enhanced App Navigator with language loading support
const AppNavigatorWithLanguage = withLanguageLoader(AppNavigator);

// Main App component with proper provider nesting
function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <LanguageProvider>
        <AuthProvider>
          <AppNavigatorWithLanguage />
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

export default App;