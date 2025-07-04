import { useTranslation, useLanguage } from '../../context/LanguageContext';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert
} from 'react-native';
import Svg, { Rect, Line, Circle, Text as SvgText, Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface InteractiveChartProps {
  data: any[];
  query: string;
  columns: string[];
}

const InteractiveChart: React.FC<InteractiveChartProps> = ({ data, query, columns }) => {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  
  // Simple locale mapping
  const getLocale = () => {
    switch (currentLanguage) {
      case 'en': return 'en-US';
      case 'de': return 'de-DE';
      case 'es': return 'es-ES';
      default: return 'tr-TR';
    }
  };
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'list'>('bar');
  const [xAxisKey, setXAxisKey] = useState('');
  const [yAxisKey, setYAxisKey] = useState('');
  const [dataLimit, setDataLimit] = useState(10);
  const [showSettings, setShowSettings] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const itemsPerPage = 6;
  const scrollViewRef = useRef<ScrollView>(null);
  const barChartScrollRef = useRef<ScrollView>(null);
  const lineChartScrollRef = useRef<ScrollView>(null);
  const mainScrollRef = useRef<ScrollView>(null);

  // Sayfa değiştiğinde scroll'u en üste getir (sadece liste için)
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  // Sayısal kolonları bul
  const getNumericColumns = () => {
    if (!data || data.length === 0) return [];
    
    return columns.filter(col => {
      const sample = data.slice(0, 5);
      return sample.some(row => 
        typeof row[col] === 'number' || 
        (typeof row[col] === 'string' && !isNaN(parseFloat(String(row[col]).replace(/\./g, '').replace(',', '.'))))
      );
    });
  };

  // İlk yüklemede otomatik ayarlar
  useEffect(() => {
    if (columns.length >= 2) {
      const firstStringColumn = columns.find(col => {
        const sample = data[0]?.[col];
        return typeof sample === 'string';
      });
      setXAxisKey(firstStringColumn || columns[0]);

      const numericColumns = getNumericColumns();
      setYAxisKey(numericColumns[0] || columns[1]);
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      if (lowerQuery.includes('trend') || lowerQuery.includes('çizgi') || lowerQuery.includes('zaman') || lowerQuery.includes('line')) {
        setChartType('line');
      } else if (lowerQuery.includes('dağılım') || lowerQuery.includes('oran') || lowerQuery.includes('pasta') || lowerQuery.includes('pie')) {
        setChartType('pie');
      } else if (lowerQuery.includes('liste') || lowerQuery.includes('list')) {
        setChartType('list');
      } else {
        setChartType('bar');
      }
    }
  }, [data, columns, query]);

  // Veriyi işle
  const processedData = useMemo(() => {
    if (!data || !xAxisKey || !yAxisKey) return [];

    return data.slice(0, dataLimit).map(item => {
      let value = item[yAxisKey];
      
      if (typeof value === 'string') {
        const numValue = parseFloat(value.replace(/\./g, '').replace(',', '.'));
        value = !isNaN(numValue) ? numValue : 0;
      }
      
      return {
        label: String(item[xAxisKey]).length > 12 
          ? String(item[xAxisKey]).substring(0, 12) + '...' 
          : String(item[xAxisKey]),
        value: Number(value) || 0,
        fullLabel: String(item[xAxisKey])
      };
    });
  }, [data, xAxisKey, yAxisKey, dataLimit]);

  // Koyu pastel renkler - sınırlı palet ama güçlü
  const getItemColor = (index: number) => {
    const baseColors = [
      '#E57373', '#81C784', '#64B5F6', '#BA68C8', 
      '#FFB74D', '#A1887F', '#4DB6AC', '#F06292'
    ];
    return baseColors[index % baseColors.length];
  };

  // Dinamik boyutlar - ekrana daha iyi sığdırmak için
  const containerHeight = Math.min(height * 0.8, 700);
  const chartWidth = width - 40;
  const chartHeight = Math.min(containerHeight * 0.4, 300);

  const handleDataPointPress = (item: any) => {
    Alert.alert(
      item.fullLabel,
      `${t('chart.value')}: ${item.value.toLocaleString(getLocale())}`,
      [{ text: t('common.ok') }]
    );
  };

  // Bar Chart - Horizontal scroll eklenmiş
  const renderBarChart = () => {
    if (!processedData.length) return null;

    const maxValue = Math.max(...processedData.map(item => item.value));
    const minBarWidth = 50;
    const barSpacing = 12;
    const totalMinWidth = processedData.length * (minBarWidth + barSpacing);
    const contentWidth = Math.max(chartWidth, totalMinWidth);
    const barWidth = Math.max(minBarWidth, (contentWidth - 80) / processedData.length - barSpacing);

    return (
      <View style={styles.chartWrapper}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{t('chart.barChart')}</Text>
          <Text style={styles.chartInfoHint}>
            {processedData.length > 8 ? `← ${t('chart.scrollToSeeAll')}` : `${processedData.length} ${t('chart.records')}`}
          </Text>
        </View>
        
        <ScrollView
          ref={barChartScrollRef}
          horizontal
          showsHorizontalScrollIndicator={true}
          bounces={true}
          style={styles.chartScrollView}
          contentContainerStyle={{ alignItems: 'center' }}
          persistentScrollbar={true}
          directionalLockEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          <Svg height={chartHeight + 80} width={contentWidth}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((percent, index) => (
              <Line 
                key={index}
                x1="50" 
                y1={30 + (chartHeight - 60) * percent} 
                x2={contentWidth - 20} 
                y2={30 + (chartHeight - 60) * percent} 
                stroke="#F0F0F0" 
                strokeWidth="1" 
              />
            ))}
            
            {/* Y Axis */}
            <Line x1="50" y1="30" x2="50" y2={chartHeight - 30} stroke="#E0E0E0" strokeWidth="2" />
            
            {/* X Axis */}
            <Line x1="50" y1={chartHeight - 30} x2={contentWidth - 20} y2={chartHeight - 30} stroke="#E0E0E0" strokeWidth="2" />
            
            {/* Y Axis Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((percent, index) => (
              <SvgText
                key={index}
                x="45"
                y={chartHeight - 25 - (chartHeight - 60) * percent}
                textAnchor="end"
                fontSize="11"
                fill="#888"
              >
                {Math.round(maxValue * percent)}
              </SvgText>
            ))}
            
            {/* Bars */}
            {processedData.map((item, index) => {
              const barHeight = maxValue > 0 ? ((item.value / maxValue) * (chartHeight - 60)) : 5;
              const x = 60 + index * (barWidth + barSpacing);
              const y = chartHeight - 30 - barHeight;
              
              return (
                <React.Fragment key={index}>
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, 8)}
                    fill={getItemColor(index)}
                    rx="4"
                    onPress={() => handleDataPointPress(item)}
                  />
                  
                  {/* Invisible touch area for better interaction */}
                  <Rect
                    x={x - 5}
                    y={y - 10}
                    width={barWidth + 10}
                    height={Math.max(barHeight, 8) + 20}
                    fill="transparent"
                    onPress={() => handleDataPointPress(item)}
                  />
                  
                  {/* Value on top */}
                  <SvgText
                    x={x + barWidth / 2}
                    y={y - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#555"
                    fontWeight="bold"
                  >
                    {item.value.toLocaleString(getLocale())}
                  </SvgText>
                  
                  {/* Label at bottom */}
                  <SvgText
                    x={x + barWidth / 2}
                    y={chartHeight + 20}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#666"
                    transform={`rotate(-45, ${x + barWidth / 2}, ${chartHeight + 20})`}
                  >
                    {item.label}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>
        </ScrollView>
      </View>
    );
  };

  // Line Chart - Horizontal scroll eklenmiş
  const renderLineChart = () => {
    if (!processedData.length) return null;

    const maxValue = Math.max(...processedData.map(item => item.value));
    const minPointSpacing = 60;
    const totalMinWidth = processedData.length * minPointSpacing;
    const contentWidth = Math.max(chartWidth, totalMinWidth);
    const stepX = (contentWidth - 60) / (processedData.length - 1);

    const points = processedData.map((item, index) => {
      const x = 40 + index * stepX;
      const y = chartHeight - 20 - (maxValue > 0 ? (item.value / maxValue) * (chartHeight - 40) : 0);
      return { x, y, value: item.value, label: item.label, item };
    });

    const pathData = points.map((point, index) => 
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    ).join(' ');

    return (
      <View style={styles.chartWrapper}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{t('chart.lineChart')}</Text>
          <Text style={styles.chartInfoHint}>
            {processedData.length > 6 ? `← ${t('chart.scrollToSeeTrend')}` : `${processedData.length} ${t('chart.points')}`}
          </Text>
        </View>
        
        <ScrollView
          ref={lineChartScrollRef}
          horizontal
          showsHorizontalScrollIndicator={true}
          bounces={true}
          style={styles.chartScrollView}
          contentContainerStyle={{ alignItems: 'center' }}
          persistentScrollbar={true}
          directionalLockEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          <Svg height={chartHeight + 60} width={contentWidth}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((percent, index) => (
              <Line 
                key={index}
                x1="40" 
                y1={20 + (chartHeight - 40) * percent} 
                x2={contentWidth - 10} 
                y2={20 + (chartHeight - 40) * percent} 
                stroke="#F0F0F0" 
                strokeWidth="1" 
              />
            ))}
            
            {/* Y Axis */}
            <Line x1="40" y1="20" x2="40" y2={chartHeight - 20} stroke="#E0E0E0" strokeWidth="2" />
            
            {/* X Axis */}
            <Line x1="40" y1={chartHeight - 20} x2={contentWidth - 10} y2={chartHeight - 20} stroke="#E0E0E0" strokeWidth="2" />
            
            {/* Y Axis Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((percent, index) => {
              const maxValue = Math.max(...processedData.map(item => item.value));
              return (
                <SvgText
                  key={index}
                  x="35"
                  y={chartHeight - 15 - (chartHeight - 40) * percent}
                  textAnchor="end"
                  fontSize="10"
                  fill="#888"
                >
                  {Math.round(maxValue * percent)}
                </SvgText>
              );
            })}
            
            {/* Line */}
            <Path
              d={pathData}
              stroke="#64B5F6"
              strokeWidth="3"
              fill="none"
            />
            
            {/* Points */}
            {points.map((point, index) => (
              <React.Fragment key={index}>
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill={getItemColor(index)}
                  stroke="#fff"
                  strokeWidth="2"
                  onPress={() => handleDataPointPress(point.item)}
                />
                
                {/* Value */}
                <SvgText
                  x={point.x}
                  y={point.y - 15}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#555"
                  fontWeight="bold"
                >
                  {point.value.toLocaleString(getLocale())}
                </SvgText>
                
                {/* Label */}
                <SvgText
                  x={point.x}
                  y={chartHeight + 15}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#666"
                  transform={`rotate(-45, ${point.x}, ${chartHeight + 15})`}
                >
                  {point.label}
                </SvgText>
              </React.Fragment>
            ))}
          </Svg>
        </ScrollView>
      </View>
    );
  };

  // Pie Chart - Legend scroll eklenmiş
  const renderPieChart = () => {
    if (!processedData.length) return null;

    const total = processedData.reduce((sum, item) => sum + item.value, 0);
    const centerX = chartWidth / 2;
    const centerY = chartHeight / 2;
    const radius = Math.min(chartWidth * 0.35, chartHeight * 0.35);
    
    let currentAngle = -Math.PI / 2;
    
    return (
      <View style={styles.chartWrapper}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{t('chart.pieChart')}</Text>
          <Text style={styles.chartInfoHint}>
            {processedData.length > 5 ? `${t('chart.scrollForDetails')} ↓` : `${processedData.length} ${t('chart.categories')}`}
          </Text>
        </View>
        
        <View style={styles.pieChartContainer}>
          <Svg height={chartHeight + 40} width={chartWidth}>
            {processedData.map((item, index) => {
              const percentage = item.value / total;
              const angle = percentage * 2 * Math.PI;
              
              if (angle < 0.01) return null;
              
              const startAngle = currentAngle;
              const endAngle = currentAngle + angle;
              
              const x1 = centerX + radius * Math.cos(startAngle);
              const y1 = centerY + radius * Math.sin(startAngle);
              const x2 = centerX + radius * Math.cos(endAngle);
              const y2 = centerY + radius * Math.sin(endAngle);
              
              const largeArcFlag = angle > Math.PI ? 1 : 0;
              
              const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ');
              
              currentAngle += angle;
              
              return (
                <React.Fragment key={index}>
                  <Path
                    d={pathData}
                    fill={getItemColor(index)}
                    stroke="#fff"
                    strokeWidth="3"
                    onPress={() => handleDataPointPress(item)}
                  />
                  
                  {/* Percentage label */}
                  {percentage > 0.06 && (
                    <SvgText
                      x={centerX + (radius * 0.7) * Math.cos(startAngle + angle / 2)}
                      y={centerY + (radius * 0.7) * Math.sin(startAngle + angle / 2)}
                      textAnchor="middle"
                      fontSize="12"
                      fill="#fff"
                      fontWeight="bold"
                    >
                      {(percentage * 100).toFixed(0)}%
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
            
            {/* Center circle */}
            <Circle
              cx={centerX}
              cy={centerY}
              r={radius * 0.3}
              fill="#fff"
              stroke="#E0E0E0"
              strokeWidth="3"
            />
            
            <SvgText
              x={centerX}
              y={centerY - 6}
              textAnchor="middle"
              fontSize="13"
              fill="#666"
              fontWeight="bold"
            >
              {t('chart.total')}
            </SvgText>
            
            <SvgText
              x={centerX}
              y={centerY + 8}
              textAnchor="middle"
              fontSize="11"
              fill="#888"
            >
              {total.toLocaleString(getLocale())}
            </SvgText>
          </Svg>
          
          {/* Scrollable Legend */}
          <ScrollView 
            style={styles.pieLegendContainer} 
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {processedData.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.legendItem}
                onPress={() => handleDataPointPress(item)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.legendColor, 
                  { backgroundColor: getItemColor(index) }
                ]} />
                <Text style={styles.legendText} numberOfLines={1}>
                  {item.label}: {item.value.toLocaleString(getLocale())} ({((item.value / total) * 100).toFixed(1)}%)
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  // List View - Scroll ve sayfalama ile
  const renderListView = () => {
    if (!processedData.length) return null;

    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = processedData.slice(startIndex, endIndex);

    return (
      <View style={styles.listWrapper}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>{t('chart.listView')}</Text>
          <Text style={styles.chartInfoHint}>
            {t('chart.page')} {currentPage + 1} / {totalPages} • {startIndex + 1}-{Math.min(endIndex, processedData.length)} / {processedData.length} {t('chart.records')}
          </Text>
        </View>
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.listScrollView}
          showsVerticalScrollIndicator={true}
          bounces={true}
          nestedScrollEnabled={true}
        >
          {currentData.map((item, index) => {
            const globalIndex = startIndex + index;
            return (
              <TouchableOpacity 
                key={globalIndex} 
                style={[styles.listItem, { borderLeftColor: getItemColor(globalIndex) }]}
                onPress={() => handleDataPointPress(item)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.listColorBar, 
                  { backgroundColor: getItemColor(globalIndex) }
                ]} />
                <View style={styles.listContent}>
                  <Text style={styles.listLabel} numberOfLines={2}>
                    {item.fullLabel}
                  </Text>
                  <Text style={styles.listValue}>
                    {item.value.toLocaleString(getLocale())}
                  </Text>
                </View>
                <View style={[styles.listBadge, { backgroundColor: getItemColor(globalIndex) }]}>
                  <Text style={styles.listBadgeText}>{globalIndex + 1}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              style={[
                styles.paginationButton, 
                currentPage === 0 && styles.paginationButtonDisabled
              ]}
              onPress={() => handlePageChange(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.paginationButtonText,
                currentPage === 0 && styles.paginationButtonTextDisabled
              ]}>‹</Text>
            </TouchableOpacity>
            
            <View style={styles.paginationInfo}>
              <Text style={styles.paginationText}>
                {t('chart.page')} {currentPage + 1} / {totalPages}
              </Text>
              <Text style={styles.paginationSubText}>
                {startIndex + 1}-{Math.min(endIndex, processedData.length)} / {processedData.length} {t('chart.records')}
              </Text>
            </View>
            
            <TouchableOpacity
              style={[
                styles.paginationButton, 
                currentPage === totalPages - 1 && styles.paginationButtonDisabled
              ]}
              onPress={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.paginationButtonText,
                currentPage === totalPages - 1 && styles.paginationButtonTextDisabled
              ]}>›</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Kayıt bilgisi */}
        <View style={styles.listSummary}>
          <Text style={styles.listSummaryText}>
            {t('chart.totalRecordsShowing', { count: processedData.length })}
          </Text>
        </View>
      </View>
    );
  };

  const renderChart = () => {
    if (!processedData.length) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="bar-chart-outline" size={48} color="#BA68C8" />
          <Text style={styles.noDataText}>{t('chart.selectData')}</Text>
          <Text style={styles.noDataSubText}>{t('chart.selectAxisSettings')}</Text>
        </View>
      );
    }

    switch (chartType) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'pie':
        return renderPieChart();
      case 'list':
        return renderListView();
      default:
        return null;
    }
  };

  const renderSettings = () => {
    if (!showSettings) return null;

    return (
      <ScrollView 
        style={styles.settingsContainer} 
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* X Axis */}
        <View style={styles.settingSection}>
          <Text style={styles.settingLabel}>{t('chart.xAxis')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.columnButtons}>
              {columns.map(column => (
                <TouchableOpacity
                  key={column}
                  style={[
                    styles.columnButton,
                    xAxisKey === column && styles.columnButtonActive
                  ]}
                  onPress={() => setXAxisKey(column)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.columnButtonText,
                    xAxisKey === column && styles.columnButtonTextActive
                  ]}>
                    {column.length > 10 ? column.substring(0, 10) + '...' : column}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Y Axis */}
        <View style={styles.settingSection}>
          <Text style={styles.settingLabel}>{t('chart.yAxis')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.columnButtons}>
              {getNumericColumns().map(column => (
                <TouchableOpacity
                  key={column}
                  style={[
                    styles.columnButton,
                    yAxisKey === column && styles.columnButtonActive
                  ]}
                  onPress={() => setYAxisKey(column)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.columnButtonText,
                    yAxisKey === column && styles.columnButtonTextActive
                  ]}>
                    {column.length > 10 ? column.substring(0, 10) + '...' : column}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Data Limit */}
        <View style={[styles.settingSection, { marginBottom: 24 }]}>
          <Text style={styles.settingLabel}>{t('chart.dataLimit')}</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 4 }}
          >
            <View style={styles.limitButtons}>
              {[5, 10, 15, 20, 25].map(limit => (
                <TouchableOpacity
                  key={limit}
                  style={[
                    styles.limitButton,
                    dataLimit === limit && styles.limitButtonActive
                  ]}
                  onPress={() => setDataLimit(limit)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.limitButtonText,
                    dataLimit === limit && styles.limitButtonTextActive
                  ]}>
                    {limit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    );
  };

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height: containerHeight }]}>
        <View style={styles.header}>
          <Ionicons name="analytics-outline" size={20} color="#64B5F6" />
          <Text style={styles.headerTitle}>{t('chart.title')}</Text>
        </View>
        <View style={styles.noDataContainer}>
          <Ionicons name="bar-chart-outline" size={48} color="#BA68C8" />
          <Text style={styles.noDataText}>{t('chart.noDataToVisualize')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height: containerHeight }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="analytics-outline" size={20} color="#64B5F6" />
          <Text style={styles.headerTitle}>{t('chart.title')}</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Chart Type Buttons */}
          <View style={styles.chartTypeContainer}>
            {[
              { type: 'bar', icon: 'bar-chart-outline' },
              { type: 'line', icon: 'trending-up-outline' },
              { type: 'pie', icon: 'pie-chart-outline' },
              { type: 'list', icon: 'list-outline' }
            ].map(({ type, icon }) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chartTypeBtn,
                  chartType === type && styles.chartTypeBtnActive
                ]}
                onPress={() => setChartType(type as any)}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={icon as any} 
                  size={18} 
                  color={chartType === type ? '#FFF' : '#666'} 
                />
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setShowSettings(!showSettings)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showSettings ? "close" : "settings-outline"} 
              size={18} 
              color="#666" 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings */}
      {renderSettings()}

      {/* Chart Info */}
      {processedData.length > 0 && (
        <View style={styles.chartInfoContainer}>
          <Text style={styles.chartInfoText}>
            {processedData.length} {t('chart.records')} • {xAxisKey} × {yAxisKey}
          </Text>
        </View>
      )}

      {/* Chart */}
      <ScrollView 
        ref={mainScrollRef}
        style={styles.chartContainer}
        showsVerticalScrollIndicator={true}
        bounces={true}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
      >
        {renderChart()}
        
        {/* Color Legend - Chart'ın altında */}
        {processedData.length > 0 && chartType !== 'pie' && (
          <View style={styles.colorLegendContainer}>
            <Text style={styles.colorLegendTitle}>{t('chart.colorKey')}</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.colorLegendScroll}
            >
              {processedData.map((item, index) => (
                <View key={index} style={styles.colorLegendItem}>
                  <View style={[styles.colorLegendDot, { backgroundColor: getItemColor(index) }]} />
                  <Text style={styles.colorLegendText} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// Styles remain the same as before
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FEFEFE',
    margin: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 10,
  },
  chartTypeContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    padding: 3,
  },
  chartTypeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  chartTypeBtnActive: {
    backgroundColor: '#81C784',
    shadowColor: '#81C784',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsContainer: {
    maxHeight: 220,
    backgroundColor: '#FAFBFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingSection: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  columnButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  columnButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  columnButtonActive: {
    backgroundColor: '#E57373',
    borderColor: '#E57373',
  },
  columnButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  columnButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  limitButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  limitButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  limitButtonActive: {
    backgroundColor: '#64B5F6',
    borderColor: '#64B5F6',
  },
  limitButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  limitButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  chartInfoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FAFBFC',
  },
  chartInfoText: {
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
    fontWeight: '500',
  },
  chartContainer: {
    flex: 1,
    padding: 16,
  },
  chartWrapper: {
    backgroundColor: '#FDFDFD',
    borderRadius: 15,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a202c',
  },
  chartInfoHint: {
    fontSize: 12,
    color: '#718096',
  },
  chartScrollView: {
    paddingVertical: 16,
  },
  pieChartContainer: {
    flexDirection: 'column',
    width: '100%',
  },
  pieLegendContainer: {
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  listWrapper: {
    width: '100%',
    backgroundColor: '#FDFDFD',
    borderRadius: 15,
    padding: 12,
    marginBottom: 16,
  },
  listScrollView: {
    maxHeight: 300,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 6,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderLeftWidth: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  listColorBar: {
    width: 6,
    height: '100%',
    position: 'absolute',
    left: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  listContent: {
    flex: 1,
    marginLeft: 16,
    paddingRight: 12,
  },
  listLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  listValue: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  listBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listBadgeText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#81C784',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#81C784',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  paginationButtonDisabled: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
    elevation: 0,
  },
  paginationButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  paginationButtonTextDisabled: {
    color: '#999',
  },
  paginationInfo: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 16,
  },
  paginationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 2,
  },
  paginationSubText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '400',
  },
  listSummary: {
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  listSummaryText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  pieLegend: {
    marginTop: 12,
    width: '100%',
    maxHeight: 100,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  legendText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  noDataContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  noDataSubText: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  colorLegendContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  colorLegendTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  colorLegendScroll: {
    maxHeight: 60,
  },
  colorLegendItem: {
    alignItems: 'center',
    marginRight: 16,
    minWidth: 80,
  },
  colorLegendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  colorLegendText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default InteractiveChart;