// src/navigation/types.ts
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

export type MainStackParamList = {
  Tabs: undefined;
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
  NotificationSettings: undefined;
};