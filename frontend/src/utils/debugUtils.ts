// Debug utilities for testing browser storage functionality

export const debugBrowserStorage = {
  // Check if browser storage is available
  isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },

  // Get all stored files with detailed info
  getAllStoredFiles(): Record<string, any> {
    try {
      const stored = localStorage.getItem('file_chat_files');
      if (!stored) return {};
      
      const files = JSON.parse(stored);
      const result: Record<string, any> = {};
      
      for (const [fileId, fileData] of Object.entries(files)) {
        const data = fileData as { filename: string; content: string; uploaded_at: number };
        result[fileId] = {
          filename: data.filename,
          contentLength: data.content.length,
          contentPreview: data.content.substring(0, 100) + '...',
          uploadedAt: new Date(data.uploaded_at).toISOString(),
          fileSizeKB: Math.round(data.content.length * 0.75 / 1024) // Approximate size
        };
      }
      
      return result;
    } catch (error) {
      console.error('Error reading browser storage:', error);
      return {};
    }
  },

  // Check if a specific file is stored
  isFileStored(fileId: string): boolean {
    try {
      const stored = localStorage.getItem('file_chat_files');
      if (!stored) return false;
      
      const files = JSON.parse(stored);
      return fileId in files;
    } catch (error) {
      console.error('Error checking file storage:', error);
      return false;
    }
  },

  // Get storage usage statistics
  getStorageStats(): {
    totalFiles: number;
    totalSizeKB: number;
    storageKey: string;
    isAvailable: boolean;
  } {
    const isAvailable = this.isStorageAvailable();
    const files = this.getAllStoredFiles();
    const totalFiles = Object.keys(files).length;
    const totalSizeKB = Object.values(files).reduce((sum: number, file: any) => sum + file.fileSizeKB, 0);
    
    return {
      totalFiles,
      totalSizeKB,
      storageKey: 'file_chat_files',
      isAvailable
    };
  },

  // Clear all stored files (for testing)
  clearAllStoredFiles(): void {
    try {
      localStorage.removeItem('file_chat_files');
      console.log('All browser-stored files cleared');
    } catch (error) {
      console.error('Error clearing browser storage:', error);
    }
  },

  // Test file upload and storage
  async testFileUpload(file: File): Promise<{
    success: boolean;
    fileId?: string;
    storedInBrowser: boolean;
    error?: string;
  }> {
    try {
      // Import the API service
      const { api } = await import('@/services/api');
      
      // Upload the file
      const result = await api.uploadFile(file);
      
      // Check if it was stored in browser
      const storedInBrowser = this.isFileStored(result.file_id);
      
      return {
        success: true,
        fileId: result.file_id,
        storedInBrowser,
        error: undefined
      };
    } catch (error) {
      return {
        success: false,
        storedInBrowser: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  // Log detailed storage information to console
  logStorageInfo(): void {
    console.group('🔍 Browser Storage Debug Info');
    
    const stats = this.getStorageStats();
    console.log('Storage Available:', stats.isAvailable);
    console.log('Storage Key:', stats.storageKey);
    console.log('Total Files:', stats.totalFiles);
    console.log('Total Size (KB):', stats.totalSizeKB);
    
    if (stats.totalFiles > 0) {
      console.log('Stored Files:');
      const files = this.getAllStoredFiles();
      Object.entries(files).forEach(([fileId, fileData]) => {
        console.log(`  - ${fileId}: ${fileData.filename} (${fileData.fileSizeKB}KB)`);
      });
    }
    
    console.groupEnd();
  }
};

// Console commands for easy debugging
if (typeof window !== 'undefined') {
  // Make debug utilities available globally for console access
  (window as any).debugStorage = debugBrowserStorage;
  
  console.log('🔧 Debug utilities available! Use these commands:');
  console.log('  debugStorage.logStorageInfo() - Show storage details');
  console.log('  debugStorage.getAllStoredFiles() - Get all stored files');
  console.log('  debugStorage.getStorageStats() - Get storage statistics');
  console.log('  debugStorage.clearAllStoredFiles() - Clear all files (testing only)');
} 