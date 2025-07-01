// src/screens/MainScreens/QueryScreen.tsx
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

interface QueryData {
  query: string;
  results: any;
}

const QueryScreen: React.FC = () => {
  const [currentQuery, setCurrentQuery] = useState<QueryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Debug: Component mount olduğunda log
  useEffect(() => {
    console.log('🔥 QueryScreen mounted');
    return () => {
      console.log('🔥 QueryScreen unmounted');
    };
  }, []);

  // Debug: State değişikliklerini izle
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
      'Sorgu Hatası',
      error,
      [
        {
          text: 'Tamam',
          style: 'default'
        },
        {
          text: 'Yeniden Dene',
          style: 'default',
          onPress: () => {
            // Optionally retry or clear current query
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
      
      {/* Debug Info - sadece development'ta */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>🔥 QUERY SCREEN DEBUG</Text>
          <Text style={styles.debugText}>Current Query: {currentQuery ? currentQuery.query : 'NULL'}</Text>
          <Text style={styles.debugText}>Showing: {!currentQuery ? 'INPUT' : 'RESULTS'}</Text>
          <Text style={styles.debugText}>Loading: {isLoading.toString()}</Text>
        </View>
      )}
      
      {!currentQuery ? (
        <View style={styles.inputWrapper}>
          <Text style={styles.sectionTitle}>📝 QUERY INPUT SECTION</Text>
          <QueryInput 
            onQuerySubmit={handleQuerySubmit}
            onError={handleQueryError}
          />
        </View>
      ) : (
        <View style={styles.resultsWrapper}>
          <Text style={styles.sectionTitle}>📊 QUERY RESULTS SECTION</Text>
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

export default QueryScreen;