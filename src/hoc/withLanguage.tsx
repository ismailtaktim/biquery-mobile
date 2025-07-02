// src/hoc/withLanguage.tsx - HOC for automatic language support
import React, { ComponentType } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

interface WithLanguageProps {
  // Props that will be passed to wrapped component
}

interface LanguageErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Error boundary specifically for language-related errors
class LanguageErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry: () => void },
  LanguageErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; onRetry: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): LanguageErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Language Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Language Error</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'An error occurred with language system'}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              this.setState({ hasError: false, error: null });
              this.props.onRetry();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

// HOC that provides language functionality to any component
export function withLanguage<P extends object>(
  WrappedComponent: ComponentType<P>
): ComponentType<P & WithLanguageProps> {
  const WithLanguageComponent = (props: P & WithLanguageProps) => {
    const { 
      isLoading, 
      error, 
      retryInitialization,
      currentLanguage,
      t 
    } = useLanguage();

    // Show loading state during language initialization
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Initializing language system...</Text>
        </View>
      );
    }

    // Show error state if language system failed
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Language Initialization Failed</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={retryInitialization}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Wrap component with error boundary
    return (
      <LanguageErrorBoundary onRetry={retryInitialization}>
        <WrappedComponent {...props} />
      </LanguageErrorBoundary>
    );
  };

  // Set display name for debugging
  WithLanguageComponent.displayName = `withLanguage(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithLanguageComponent;
}

// Utility HOC for screens that need language loading state
export function withLanguageLoader<P extends object>(
  WrappedComponent: ComponentType<P>,
  customLoadingComponent?: React.ComponentType
): ComponentType<P> {
  const WithLanguageLoaderComponent = (props: P) => {
    const { isLoading } = useLanguage();

    if (isLoading) {
      if (customLoadingComponent) {
        const CustomLoading = customLoadingComponent;
        return <CustomLoading />;
      }
      
      return (
        <View style={styles.fullScreenLoading}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    return <WrappedComponent {...props} />;
  };

  WithLanguageLoaderComponent.displayName = `withLanguageLoader(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithLanguageLoaderComponent;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  fullScreenLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});