// src/components/query/QueryResults.tsx - Analysis Integration
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Share,
  Platform,
  AlertButton
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InteractiveChart from '../charts/InteractiveChart';
import AnalysisResultModal from '../analytics/AnalysisResultModal';
import apiService from '../../services/apiService';

const { width } = Dimensions.get('window');

interface QueryResultsProps {
  query: string;
  data: any[];
  columns: string[];
  sql?: string;
  executionTime?: number;
  onNewQuery: () => void;
}

const QueryResults: React.FC<QueryResultsProps> = ({
  query,
  data,
  columns,
  sql,
  executionTime,
  onNewQuery
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [showSQL, setShowSQL] = useState(false);
  const [showChart, setShowChart] = useState(false);
  
  // Analysis states
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [currentAnalysisJobId, setCurrentAnalysisJobId] = useState<string | null>(null);
  const [currentAnalysisType, setCurrentAnalysisType] = useState<'general' | 'anomaly' | 'forecast' | 'trends'>('general');
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  
  const itemsPerPage = 15;
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const currentData = data.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const getColumnWidth = () => {
    const availableWidth = width - 32;
    const columnWidth = Math.max(availableWidth / columns.length, 100);
    return Math.min(columnWidth, 200);
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '-';
    
    const str = String(value).trim();
    
    if (str.length > 20) {
      return str.substring(0, 20) + '...';
    }
    
    return str;
  };

  const shouldShowChart = () => {
    const chartKeywords = ['grafik', 'çiz', 'trend', 'chart', 'draw'];
    const hasChartKeyword = chartKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );
    
    const hasNumericData = data.some(row => 
      Object.values(row).some(value => 
        typeof value === 'number' || 
        (typeof value === 'string' && !isNaN(parseFloat(value.replace(/\./g, '').replace(',', '.'))))
      )
    );
    
    return hasChartKeyword || (columns.length >= 2 && hasNumericData);
  };

  const shouldShowAnalysis = () => {
    // Analysis için minimum 5 kayıt ve en az 1 numeric column gerekli
    return data.length >= 5 && columns.some(col => {
      return data.some(row => 
        typeof row[col] === 'number' || 
        (typeof row[col] === 'string' && !isNaN(parseFloat(String(row[col]).replace(/\./g, '').replace(',', '.'))))
      );
    });
  };

  const handleCellPress = (value: any, columnName: string) => {
    const fullValue = String(value || '-');
    if (fullValue.length > 20) {
      Alert.alert(columnName, fullValue);
    }
  };

  const handleShare = async () => {
    try {
      const shareText = `Sorgu: ${query}\nSonuç: ${data.length} kayıt\n\nBiQuery Mobile`;
      await Share.share({ message: shareText });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  // Analysis functions
  const startAnalysis = async (analysisType: 'general' | 'anomaly' | 'forecast' | 'trends') => {
    if (isStartingAnalysis) return;

    setIsStartingAnalysis(true);
    
    try {
      console.log('🔬 Starting analysis:', { type: analysisType, dataLength: data.length });
      
      // Show loading
      Alert.alert(
        'Analiz Başlatılıyor',
        `${getAnalysisTypeTitle(analysisType)} başlatılıyor...`,
        [{ text: 'Tamam' }]
      );

      const response = await apiService.startAnalysis(data, analysisType);
      
      if (response.job_id) {
        setCurrentAnalysisJobId(response.job_id);
        setCurrentAnalysisType(analysisType);
        setAnalysisModalVisible(true);
        
        console.log('✅ Analysis started:', response.job_id);
      } else {
        Alert.alert('Hata', 'Analiz başlatılamadı. Lütfen tekrar deneyin.');
      }
    } catch (error: any) {
      console.error('❌ Analysis start error:', error);
      Alert.alert(
        'Analiz Hatası', 
        error.message || 'Analiz başlatılırken bir hata oluştu'
      );
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  const getAnalysisTypeTitle = (type: string) => {
    switch (type) {
      case 'general': return 'Genel Analiz';
      case 'anomaly': return 'Anomali Analizi';
      case 'forecast': return 'Tahmin Analizi';
      case 'trends': return 'Trend Analizi';
      default: return 'Veri Analizi';
    }
  };

  const handleAnalysisComplete = () => {
    console.log('📊 Analysis completed');
    // Modal açık kalır, kullanıcı sonuçları görebilir
  };

  const handleAnalysisModalClose = () => {
    setAnalysisModalVisible(false);
    setCurrentAnalysisJobId(null);
  };

  const showAnalysisOptions = () => {
    const options: AlertButton[] = [
      { 
        text: 'İptal', 
        style: 'cancel' 
      },
      { 
        text: 'Genel Analiz', 
        onPress: () => startAnalysis('general'),
        style: 'default'
      },
      { 
        text: 'Trend Analizi', 
        onPress: () => startAnalysis('trends'),
        style: 'default'
      },
      { 
        text: 'Anomali Tespiti', 
        onPress: () => startAnalysis('anomaly'),
        style: 'default'
      },
      { 
        text: 'Tahmin Analizi', 
        onPress: () => startAnalysis('forecast'),
        style: 'default'
      },
    ];

    Alert.alert(
      'Analiz Türü Seçin',
      'Hangi tür analiz yapmak istiyorsunuz?',
      options
    );
  };

  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onNewQuery}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sonuçlar</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={64} color="#999" />
          <Text style={styles.emptyTitle}>Veri Bulunamadı</Text>
          <Text style={styles.emptyText}>
            Sorgunuz çalıştı ancak sonuç bulunamadı.
          </Text>
          <TouchableOpacity style={styles.newQueryButton} onPress={onNewQuery}>
            <Text style={styles.newQueryButtonText}>Yeni Sorgu</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onNewQuery}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sonuçlar</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color="#666" />
          </TouchableOpacity>
          {shouldShowChart() && (
            <TouchableOpacity 
              style={styles.chartToggle} 
              onPress={() => setShowChart(!showChart)}
            >
              <Ionicons 
                name={showChart ? "list-outline" : "stats-chart-outline"} 
                size={20} 
                color="#007AFF" 
              />
              <Text style={styles.chartToggleText}>
                {showChart ? 'Tablo' : 'Grafik'}
              </Text>
            </TouchableOpacity>
          )}
          {shouldShowAnalysis() && (
            <TouchableOpacity 
              style={styles.analysisButton} 
              onPress={showAnalysisOptions}
              disabled={isStartingAnalysis}
            >
              <Ionicons 
                name="analytics-outline" 
                size={20} 
                color="#8B5CF6" 
              />
              <Text style={styles.analysisButtonText}>Analiz</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Query Info */}
      <View style={styles.queryInfo}>
        <Text style={styles.queryText} numberOfLines={2}>{query}</Text>
        <View style={styles.statsRow}>
          <Text style={styles.statText}>{data.length} kayıt</Text>
          <Text style={styles.statText}>{columns.length} kolon</Text>
          {executionTime && (
            <Text style={styles.statText}>{executionTime.toFixed(2)}s</Text>
          )}
        </View>
        
        {sql && (
          <TouchableOpacity 
            style={styles.sqlToggle}
            onPress={() => setShowSQL(!showSQL)}
            activeOpacity={0.7}
          >
            <View style={styles.sqlToggleContent}>
              <Ionicons 
                name="code-outline" 
                size={18} 
                color="#007AFF" 
              />
              <Text style={styles.sqlToggleText}>
                {showSQL ? 'SQL Sorguyu Gizle' : 'SQL Sorgusunu Görüntüle'}
              </Text>
            </View>
            <View style={[styles.sqlToggleIcon, showSQL && styles.sqlToggleIconRotated]}>
              <Ionicons 
                name="chevron-down" 
                size={18} 
                color="#007AFF" 
              />
            </View>
          </TouchableOpacity>
        )}
        
        {showSQL && sql && (
          <View style={styles.sqlContainer}>
            <View style={styles.sqlHeader}>
              <Ionicons name="terminal-outline" size={16} color="#007AFF" />
              <Text style={styles.sqlHeaderText}>SQL Sorgusu</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <Text style={styles.sqlText}>{sql}</Text>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Chart */}
      {showChart && (
        <InteractiveChart 
          data={data}
          query={query}
          columns={columns}
        />
      )}

      {/* Table */}
      {!showChart && (
        <View style={styles.tableSection}>
          <View style={styles.tableSectionHeader}>
            <Ionicons name="grid-outline" size={20} color="#007AFF" />
            <Text style={styles.tableSectionTitle}>Veri Tablosu</Text>
          </View>
          
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ minWidth: width - 32 }}>
                {/* Header */}
                <View style={styles.tableHeader}>
                  {columns.map((column, index) => (
                    <View key={index} style={[styles.headerCell, { width: getColumnWidth() }]}>
                      <Text style={styles.headerCellText} numberOfLines={2}>
                        {column}
                      </Text>
                    </View>
                  ))}
                </View>
                
                {/* Body */}
                <ScrollView style={styles.tableBody} showsVerticalScrollIndicator={false}>
                  {currentData.map((row, rowIndex) => (
                    <View key={rowIndex} style={[
                      styles.tableRow,
                      rowIndex % 2 === 0 ? styles.evenRow : styles.oddRow
                    ]}>
                      {columns.map((column, colIndex) => (
                        <TouchableOpacity 
                          key={colIndex} 
                          style={[styles.dataCell, { width: getColumnWidth() }]}
                          onPress={() => handleCellPress(row[column], column)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.dataCellText}>
                            {formatValue(row[column])}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </ScrollView>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* Bottom */}
      <View style={styles.bottom}>
        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <TouchableOpacity 
              style={[styles.pageButton, currentPage === 0 && styles.pageButtonDisabled]}
              onPress={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <Ionicons name="chevron-back" size={20} color={currentPage === 0 ? "#ccc" : "#333"} />
            </TouchableOpacity>
            
            <Text style={styles.pageText}>
              {currentPage + 1} / {totalPages} ({data.length} kayıt)
            </Text>
            
            <TouchableOpacity 
              style={[styles.pageButton, currentPage === totalPages - 1 && styles.pageButtonDisabled]}
              onPress={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
            >
              <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages - 1 ? "#ccc" : "#333"} />
            </TouchableOpacity>
          </View>
        )}
        
        {/* New Query Button */}
        <TouchableOpacity style={styles.newQueryButton} onPress={onNewQuery}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.newQueryButtonText}>Yeni Sorgu</Text>
        </TouchableOpacity>
      </View>

      {/* Analysis Modal */}
      {currentAnalysisJobId && (
        <AnalysisResultModal
          jobId={currentAnalysisJobId}
          analysisType={currentAnalysisType}
          visible={analysisModalVisible}
          onClose={handleAnalysisModalClose}
          onComplete={handleAnalysisComplete}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  chartToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  analysisButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  analysisButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  headerSpacer: {
    width: 40,
  },
  queryInfo: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  queryText: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  sqlToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  sqlToggleContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sqlToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
  sqlToggleIcon: {
    transform: [{ rotate: '0deg' }],
  },
  sqlToggleIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  sqlContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  sqlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#404040',
    gap: 8,
  },
  sqlHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  sqlText: {
    fontSize: 13,
    color: '#f8f8f2',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    padding: 16,
    lineHeight: 20,
  },
  tableSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
  },
  tableSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  tableSection: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  tableContainer: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f4',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  headerCell: {
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    justifyContent: 'center',
    minHeight: 60,
    backgroundColor: '#f8f9fa',
  },
  headerCellText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2c3e50',
    textAlign: 'center',
    lineHeight: 18,
  },
  tableBody: {
    maxHeight: 400,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  evenRow: {
    backgroundColor: '#fff',
  },
  oddRow: {
    backgroundColor: '#f8f9fa',
  },
  dataCell: {
    padding: 14,
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
    justifyContent: 'center',
    minHeight: 50,
  },
  dataCellText: {
    fontSize: 12,
    color: '#34495e',
    textAlign: 'center',
    lineHeight: 16,
  },
  bottom: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonDisabled: {
    backgroundColor: '#f8f8f8',
  },
  pageText: {
    fontSize: 14,
    color: '#666',
  },
  newQueryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  newQueryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default QueryResults;