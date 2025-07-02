// src/screens/MainScreens/QueryScreen.tsx - Enhanced with language support
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  SafeAreaView,
  StatusBar
} from 'react-native';
import QueryInput from '../../components/query/QueryInput';
import QueryResults from '../../components/query/QueryResults';
import LanguageButton from '../../components/common/LanguageButton';
import { useTranslation } from '../../context/LanguageContext';
import { withLanguage } from '../../hoc/withLanguage';

interface QueryData {
  query: string;
  results: any;
}

const QueryScreen: React.FC = () => {
  const { t } = useTranslation();
  const [currentQuery, setCurrentQuery] = useState<QueryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Debug: Component mount
  useEffect(() => {
    console.log('🔥 QueryScreen mounted');
    return () => {
      console.log('🔥 QueryScreen unmounted');
    };
  }, []);

  // Debug: State changes
  useEffect(() => {
    console.log('🔥 QueryScreen state changed:', {
      hasCurrentQuery: !!currentQuery,
      currentQuery: currentQuery?.query,
      isLoading
    });
  }, [currentQuery, isLoading]);

  const handleQuerySubmit = (query: string, results: any) => {
    console.log('📊 QueryScreen - Query results received:', {
      query,
      dataLength: results.data?.length,
      columns: results.columns?.length
    });

    setCurrentQuery({
      query,
      results
    });
  };

  const handleQueryError = (error: string) => {
    console.error('❌ QueryScreen - Query error:', error);
    
    Alert.alert(
      t('common.error'),
      error,
      [
        {
          text: t('common.ok'),
          style: 'default'
        },
        {
          text: t('common.retry'),
          style: 'default',
          onPress: () => {
            // Optionally retry or clear current query
            console.log('🔄 User requested retry');
          }
        }
      ]
    );
  };

  const handleNewQuery = () => {
    console.log('🔄 QueryScreen - New query requested');
    setCurrentQuery(null);
  };

  console.log('🔥 QueryScreen rendering...', {
    showingInput: !currentQuery,
    showingResults: !!currentQuery
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header with Language Support */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{t('queryInput.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('queryInput.subtitle')}</Text>
        </View>
        <LanguageButton variant="compact" />
      </View>
      
      {/* Debug Info - only in development */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>🔥 QUERY SCREEN DEBUG</Text>
          <Text style={styles.debugText}>
            {t('common.info')}: {currentQuery ? currentQuery.query : t('common.loading')}
          </Text>
          <Text style={styles.debugText}>
            {t('navigation.query')}: {!currentQuery ? t('queryInput.title') : t('queryInput.results')}
          </Text>
          <Text style={styles.debugText}>
            {t('common.loading')}: {isLoading.toString()}
          </Text>
        </View>
      )}
      
      {!currentQuery ? (
        <View style={styles.inputWrapper}>
          <Text style={styles.sectionTitle}>📝 {t('queryInput.title').toUpperCase()}</Text>
          <QueryInput 
            onQuerySubmit={handleQuerySubmit}
            onError={handleQueryError}
          />
        </View>
      ) : (
        <View style={styles.resultsWrapper}>
          <Text style={styles.sectionTitle}>📊 {t('analysis.results').toUpperCase()}</Text>
          <QueryResults
            query={currentQuery.query}
            data={currentQuery.results.data || []}
            columns={currentQuery.results.columns || []}
            sql={currentQuery.results.sql}
            executionTime={currentQuery.results.execution_time}
            onNewQuery={handleNewQuery}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  debugContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#DC2626',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'center',
    padding: 8,
    backgroundColor: '#D1FAE5',
    marginBottom: 8,
  },
  inputWrapper: {
    flex: 1,
  },
  resultsWrapper: {
    flex: 1,
  },
});

export default withLanguage(QueryScreen);