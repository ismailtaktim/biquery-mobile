// src/navigation/types.ts - Fixed version
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Query: undefined;        
  Agents: undefined;
  Products: undefined;
  Regional: undefined;
  Comparisons: undefined;
  Reports: undefined;
};

// Fixed: MainStackParamList now includes "Tabs" which is used in MainNavigator
export type MainStackParamList = {
  Tabs: undefined; // Added this line to fix the error
  MainTabs: undefined;
  QueryResults: {
    data: any[];
    columns: string[];
    query: string;
  };
  Analysis: {
    jobId: string;
    analysisType: string;
  };
};