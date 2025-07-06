interface ChatRequest {
  developer_message: string;
  user_message: string;
  model?: string;
}

interface FileChatRequest {
  user_message: string;
  file_ids: string[];
  session_id?: string;
  model?: string;
}

export interface ChatSession {
  session_id: string;
  created_at: string;
  file_ids: string[];
  messages: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
}

interface ChatHistoryResponse {
  sessions: ChatSession[];
}

export interface FileUploadResponse {
  filename: string;
  file_id: string;
  message: string;
  indexing_status: string;
  use_browser_storage: boolean;
  file_content?: string; // Base64 encoded file content for browser storage
  vector_store_type: string; // "memory", "qdrant", or "browser"
}

export interface FileInfo {
  file_id: string;
  filename: string;
  indexing_status: string;
  message: string;
  vector_store_type: string;
}

interface FileListResponse {
  files: FileInfo[];
}

interface FileIndexingStatus {
  file_id: string;
  status: string;
  message: string;
}

interface HealthResponse {
  status: string;
  readonly: boolean;
}

interface PreIndexedFileRequest {
  file_id: string;
  filename: string;
  chunks: string[];
}

interface GeneralChatRequest {
  user_message: string;
  model?: string;
}

const FALLBACK_API_URL = 'http://localhost:8000';
if (! process.env.NEXT_PUBLIC_API_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not set, falling back to ' + FALLBACK_API_URL);
}
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || FALLBACK_API_URL;

console.log('FinalAPI_BASE_URL:', API_BASE_URL);

// Browser storage utilities
const BROWSER_STORAGE_KEY = 'file_chat_files';

export const getBrowserStoredFiles = (): Record<string, { filename: string; content?: string; uploaded_at: number; vector_store_type?: string }> => {
  try {
    const stored = localStorage.getItem(BROWSER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to get browser stored files:', error);
    return {};
  }
};

export const setBrowserStoredFiles = (files: Record<string, { filename: string; content?: string; uploaded_at: number; vector_store_type?: string }>) => {
  try {
    localStorage.setItem(BROWSER_STORAGE_KEY, JSON.stringify(files));
  } catch (error) {
    console.error('Failed to set browser stored files:', error);
  }
};

const addBrowserStoredFile = (fileId: string, filename: string, content: string) => {
  const files = getBrowserStoredFiles();
  files[fileId] = {
    filename,
    content,
    uploaded_at: Date.now()
  };
  setBrowserStoredFiles(files);
};

const removeBrowserStoredFile = (fileId: string) => {
  const files = getBrowserStoredFiles();
  delete files[fileId];
  setBrowserStoredFiles(files);
};

export interface HealthCheckResponse {
  status: string;
  readonly: boolean;
  environment: string;
  vector_store: string;
  browser_storage: boolean;
  features: {
    qdrant: boolean;
    browser_storage: boolean;
    readonly: boolean;
  };
}

// Browser storage utilities
class BrowserStorage {
  private readonly STORAGE_KEY = 'uploaded_files';
  private readonly INDEXING_STATUS_KEY = 'indexing_status';

  // Store file in browser storage
  storeFile(fileId: string, filename: string, base64Content: string): void {
    try {
      const files = this.getStoredFiles();
      files[fileId] = {
        filename,
        content: base64Content,
        stored_at: new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(files));
      console.log(`📁 Stored file in browser: ${filename} (${fileId})`);
    } catch (error) {
      console.error('Error storing file in browser:', error);
    }
  }

  // Get file from browser storage
  getFile(fileId: string): { filename: string; content: string; stored_at: string } | null {
    try {
      const files = this.getStoredFiles();
      return files[fileId] || null;
    } catch (error) {
      console.error('Error getting file from browser:', error);
      return null;
    }
  }

  // Get all stored files
  getStoredFiles(): Record<string, { filename: string; content: string; stored_at: string }> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error getting stored files:', error);
      return {};
    }
  }

  // Remove file from browser storage
  removeFile(fileId: string): void {
    try {
      const files = this.getStoredFiles();
      delete files[fileId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(files));
      console.log(`🗑️ Removed file from browser: ${fileId}`);
    } catch (error) {
      console.error('Error removing file from browser:', error);
    }
  }

  // Clear all stored files
  clearAllFiles(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.INDEXING_STATUS_KEY);
      console.log('🗑️ Cleared all browser storage');
    } catch (error) {
      console.error('Error clearing browser storage:', error);
    }
  }

  // Store indexing status locally
  storeIndexingStatus(fileId: string, status: any): void {
    try {
      const statuses = this.getIndexingStatuses();
      statuses[fileId] = status;
      localStorage.setItem(this.INDEXING_STATUS_KEY, JSON.stringify(statuses));
    } catch (error) {
      console.error('Error storing indexing status:', error);
    }
  }

  // Get indexing status locally
  getIndexingStatus(fileId: string): any {
    try {
      const statuses = this.getIndexingStatuses();
      return statuses[fileId] || null;
    } catch (error) {
      console.error('Error getting indexing status:', error);
      return null;
    }
  }

  // Get all indexing statuses
  getIndexingStatuses(): Record<string, any> {
    try {
      const stored = localStorage.getItem(this.INDEXING_STATUS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error getting indexing statuses:', error);
      return {};
    }
  }

  // Remove indexing status
  removeIndexingStatus(fileId: string): void {
    try {
      const statuses = this.getIndexingStatuses();
      delete statuses[fileId];
      localStorage.setItem(this.INDEXING_STATUS_KEY, JSON.stringify(statuses));
    } catch (error) {
      console.error('Error removing indexing status:', error);
    }
  }
}

// Create browser storage instance
const browserStorage = new BrowserStorage();

// Local indexing status tracking
const localIndexingStatus = new Map<string, any>();

export const api = {
  async chat(request: ChatRequest): Promise<ReadableStream<any>> {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat failed: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    return response.body;
  },

  async chatWithFile(request: FileChatRequest): Promise<ReadableStream<any>> {
    const response = await fetch(`${API_BASE_URL}/api/chat-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat failed: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    return response.body;
  },

  async getChatHistory(): Promise<ChatHistoryResponse> {
    const response = await fetch(`${API_BASE_URL}/api/chat-history`);
    if (!response.ok) {
      throw new Error(`Failed to get chat history: ${response.statusText}`);
    }
    return response.json();
  },

  async getChatSession(sessionId: string): Promise<ChatSession> {
    const response = await fetch(`${API_BASE_URL}/api/chat-history/${sessionId}`);
    if (!response.ok) {
      throw new Error(`Failed to get chat session: ${response.statusText}`);
    }
    return response.json();
  },

  async uploadFile(file: File): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/upload-file`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    const result = await response.json();
    
    // If browser storage is enabled and file content is provided, store it
    if (result.use_browser_storage && result.file_content) {
      browserStorage.storeFile(result.file_id, result.filename, result.file_content);
    }

    return result;
  },

  async deleteAllFiles(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/files`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Delete all failed: ${errorText}`);
    }

    // Also clear browser storage
    browserStorage.clearAllFiles();
    localIndexingStatus.clear();
  },

  async indexBrowserStoredFile(fileId: string, filename: string, base64Content: string): Promise<void> {
    try {
      console.log(`🔍 Starting indexing for browser-stored file: ${filename} (${fileId})`);
      
      // Set initial status to 'indexing' to show progress
      const initialStatus = {
        file_id: fileId,
        status: 'indexing',
        message: 'Processing file and creating embeddings...'
      };
      
      // Store this status locally for immediate UI feedback
      this.updateLocalIndexingStatus(fileId, initialStatus);
      
      // Convert base64 to File object
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const file = new File([bytes], filename, { type: 'application/octet-stream' });

      console.log(`📁 File created: ${file.name} (${file.size} bytes)`);

      // Import fileProcessor dynamically to avoid SSR issues
      const { FileProcessor } = await import('@/utils/fileProcessor');
      
      console.log(`⚙️ Processing file with FileProcessor...`);
      
      // Process the file
      const { chunks } = await FileProcessor.processFile(file, fileId);
      
      console.log(`✅ File processed: ${chunks.length} chunks`);
      
      // FileProcessor.processFile() already sends the data to the backend
      // No need to send it again here
      console.log(`✅ Successfully indexed browser-stored file: ${filename}`);
      
      // Update status to completed
      const completedStatus = {
        file_id: fileId,
        status: 'completed',
        message: `Successfully indexed ${chunks.length} chunks`
      };
      this.updateLocalIndexingStatus(fileId, completedStatus);
      
    } catch (error) {
      console.error('Error indexing browser stored file:', error);
      
      // Update status to failed
      const failedStatus = {
        file_id: fileId,
        status: 'failed',
        message: `Indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      this.updateLocalIndexingStatus(fileId, failedStatus);
      
      throw error;
    }
  },

  updateLocalIndexingStatus(fileId: string, status: FileIndexingStatus): void {
    localIndexingStatus.set(fileId, status);
    browserStorage.storeIndexingStatus(fileId, status);
  },

  getLocalIndexingStatus(fileId: string): FileIndexingStatus | null {
    return localIndexingStatus.get(fileId) || null;
  },

  async listFiles(): Promise<FileInfo[]> {
    const response = await fetch(`${API_BASE_URL}/api/files`);
    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.files;
  },

  async getFileIndexingStatus(fileId: string): Promise<FileIndexingStatus> {
    const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/status`);
    if (!response.ok) {
      throw new Error(`Failed to get file status: ${response.statusText}`);
    }
    return response.json();
  },

  async healthCheck(): Promise<HealthCheckResponse> {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  },

  async indexExistingBrowserStoredFiles(): Promise<void> {
    try {
      const healthResponse = await this.healthCheck();
      if (!healthResponse.readonly) {
        return; // Only index browser-stored files in read-only mode
      }

      const browserFiles = getBrowserStoredFiles();
      
      for (const [fileId, fileData] of Object.entries(browserFiles)) {
        // Check if this file is already indexed on the backend
        try {
          const statusResponse = await this.getFileIndexingStatus(fileId);
          if (statusResponse.status === 'completed') {
            continue; // Already indexed
          }
        } catch (error) {
          // File not found on backend, needs indexing
        }
        
        // Index the file
        if (fileData.content) {
          await this.indexBrowserStoredFile(fileId, fileData.filename, fileData.content);
        } else {
          console.warn(`⚠️ No content found for file ${fileId}, skipping indexing`);
        }
      }
    } catch (error) {
      console.error('Error indexing existing browser-stored files:', error);
    }
  },

  // Browser storage utilities
  getBrowserStoredFiles,
  setBrowserStoredFiles,
  addBrowserStoredFile,
  removeBrowserStoredFile,

  async deleteFile(fileId: string): Promise<{ message: string }> {
    try {
      // Try to delete from server first
      const response = await fetch(`${API_BASE_URL}/api/files/${fileId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Also remove from browser storage if it exists there
        removeBrowserStoredFile(fileId);
        return response.json();
      } else if (response.status === 404) {
        // File not found on server, try to remove from browser storage only
        removeBrowserStoredFile(fileId);
        return { message: `File ${fileId} deleted from browser storage` };
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to delete file: ${errorText}`);
      }
    } catch (error) {
      // If server is unreachable, try to remove from browser storage
      removeBrowserStoredFile(fileId);
      return { message: `File ${fileId} deleted from browser storage` };
    }
  },

  getBrowserStorage(): BrowserStorage {
    return browserStorage;
  },

  async testPdfProcessing(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/test-pdf-processing`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PDF processing test failed: ${errorText}`);
    }

    return response.json();
  },

  logStorageInfo(): void {
    console.log('📊 Storage Information:');
    console.log('Browser Storage Files:', browserStorage.getStoredFiles());
    console.log('Local Indexing Status:', Array.from(localIndexingStatus.entries()));
    console.log('Browser Stored Files (legacy):', getBrowserStoredFiles());
  },

  isFileStored(fileId: string): boolean {
    return browserStorage.getFile(fileId) !== null;
  },

  clearAllStoredFiles(): void {
    browserStorage.clearAllFiles();
    localIndexingStatus.clear();
  },

  async generalChat(request: GeneralChatRequest): Promise<ReadableStream<any>> {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat failed: ${errorText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    return response.body;
  },
};