import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueryHistoryItem {
  query: string;
  timestamp: number;
  language: string;
  resultCount?: number;
}

const HISTORY_KEY = 'queryHistory';
const MAX_HISTORY_SIZE = 50;

export class QueryHistoryService {
  async addQuery(query: string, language: string, resultCount?: number): Promise<void> {
    try {
      const historyData = await this.getHistory();
      
      const newItem: QueryHistoryItem = {
        query: query.trim(),
        timestamp: Date.now(),
        language,
        resultCount
      };
      
      // Aynı sorguyu tekrar ekleme, en üste taşı
      const filteredHistory = historyData.filter(item => 
        item.query.toLowerCase() !== query.toLowerCase()
      );
      
      const updatedHistory = [newItem, ...filteredHistory].slice(0, MAX_HISTORY_SIZE);
      
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Query history save error:', error);
    }
  }

  async getHistory(): Promise<QueryHistoryItem[]> {
    try {
      const historyString = await AsyncStorage.getItem(HISTORY_KEY);
      return historyString ? JSON.parse(historyString) : [];
    } catch (error) {
      console.error('Query history load error:', error);
      return [];
    }
  }

  async getRecentQueries(limit: number = 10): Promise<string[]> {
    try {
      const history = await this.getHistory();
      return history
        .slice(0, limit)
        .map(item => item.query);
    } catch (error) {
      console.error('Recent queries load error:', error);
      return [];
    }
  }

  async getQueriesByLanguage(language: string, limit: number = 10): Promise<string[]> {
    try {
      const history = await this.getHistory();
      return history
        .filter(item => item.language === language)
        .slice(0, limit)
        .map(item => item.query);
    } catch (error) {
      console.error('Language queries load error:', error);
      return [];
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error('Clear history error:', error);
    }
  }

  async removeQuery(query: string): Promise<void> {
    try {
      const history = await this.getHistory();
      const updatedHistory = history.filter(item => 
        item.query.toLowerCase() !== query.toLowerCase()
      );
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Remove query error:', error);
    }
  }

  async getStatistics(): Promise<{
    totalQueries: number;
    languageBreakdown: Record<string, number>;
    mostUsedQueries: Array<{query: string, count: number}>;
  }> {
    try {
      const history = await this.getHistory();
      
      const languageBreakdown: Record<string, number> = {};
      const queryCount: Record<string, number> = {};
      
      history.forEach(item => {
        // Language breakdown
        languageBreakdown[item.language] = (languageBreakdown[item.language] || 0) + 1;
        
        // Query count
        const normalizedQuery = item.query.toLowerCase();
        queryCount[normalizedQuery] = (queryCount[normalizedQuery] || 0) + 1;
      });
      
      const mostUsedQueries = Object.entries(queryCount)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      return {
        totalQueries: history.length,
        languageBreakdown,
        mostUsedQueries
      };
    } catch (error) {
      console.error('Statistics error:', error);
      return {
        totalQueries: 0,
        languageBreakdown: {},
        mostUsedQueries: []
      };
    }
  }
}

export const queryHistoryService = new QueryHistoryService();