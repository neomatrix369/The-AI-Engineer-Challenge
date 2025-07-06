// Feature flag configuration
export interface FeatureFlags {
  useQdrant: boolean;
  useBrowserStorage: boolean;
  isReadOnly: boolean;
  isVercel: boolean;
  vectorStoreType: 'memory' | 'qdrant' | 'browser';
}

// Get feature flags from environment or use defaults
export const getFeatureFlags = (): FeatureFlags => {
  const isVercel = process.env.NEXT_PUBLIC_VERCEL === 'true';
  const useQdrant = process.env.NEXT_PUBLIC_USE_QDRANT === 'true';
  const useBrowserStorage = process.env.NEXT_PUBLIC_USE_BROWSER_STORAGE !== 'false';
  
  // Determine vector store type
  let vectorStoreType: 'memory' | 'qdrant' | 'browser' = 'memory';
  if (useQdrant) {
    vectorStoreType = 'qdrant';
  } else if (useBrowserStorage && isVercel) {
    vectorStoreType = 'browser';
  }
  
  return {
    useQdrant,
    useBrowserStorage,
    isReadOnly: isVercel,
    isVercel,
    vectorStoreType
  };
};

// Get feature flags with health check fallback
export const getFeatureFlagsWithHealthCheck = async (): Promise<FeatureFlags> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/health`);
    if (response.ok) {
      const healthData = await response.json();
      return {
        useQdrant: healthData.features?.qdrant || false,
        useBrowserStorage: healthData.features?.browser_storage || false,
        isReadOnly: healthData.features?.readonly || false,
        isVercel: healthData.environment === 'vercel',
        vectorStoreType: healthData.vector_store === 'qdrant' ? 'qdrant' : 
                        healthData.vector_store === 'memory' ? 'memory' : 'browser'
      };
    }
  } catch (error) {
    console.warn('Health check failed, using default feature flags:', error);
  }
  
  // Fallback to environment-based flags
  return getFeatureFlags();
};

// Feature flag utilities
export const isQdrantEnabled = (): boolean => {
  return getFeatureFlags().useQdrant;
};

export const isBrowserStorageEnabled = (): boolean => {
  return getFeatureFlags().useBrowserStorage;
};

export const isReadOnlyEnvironment = (): boolean => {
  return getFeatureFlags().isReadOnly;
};

export const getVectorStoreType = (): 'memory' | 'qdrant' | 'browser' => {
  return getFeatureFlags().vectorStoreType;
};

// Environment-specific configurations
export const getEnvironmentConfig = () => {
  const flags = getFeatureFlags();
  
  return {
    // Upload behavior
    shouldUseBrowserStorage: flags.isReadOnly && flags.useBrowserStorage,
    shouldUseQdrant: flags.useQdrant,
    
    // UI behavior
    showVectorStoreInfo: true,
    showEnvironmentInfo: true,
    
    // Feature availability
    canDeleteFiles: true,
    canUploadFiles: true,
    canIndexFiles: true,
    
    // Storage type descriptions
    getStorageDescription: () => {
      if (flags.useQdrant) {
        return 'Qdrant Vector Database';
      } else if (flags.isReadOnly && flags.useBrowserStorage) {
        return 'Browser Storage + Memory';
      } else {
        return 'In-Memory Storage';
      }
    },
    
    // Environment description
    getEnvironmentDescription: () => {
      if (flags.isVercel) {
        return 'Vercel (Read-only)';
      } else {
        return 'Local Development';
      }
    }
  };
}; 