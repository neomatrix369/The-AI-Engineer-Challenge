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

interface FileUploadResponse {
  filename: string;
  file_id: string;
  message: string;
  indexing_status: string;
  use_browser_storage: boolean;
  file_content?: string; // Base64 encoded file content for browser storage
}

export interface FileInfo {
  file_id: string;
  original_filename: string;
  uploaded_at: number;
  indexing_status: string;
  indexing_message: string;
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
  embeddings: number[][];
}

const FALLBACK_API_URL = 'http://localhost:8000';
if (! process.env.NEXT_PUBLIC_API_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not set, falling back to ' + FALLBACK_API_URL);
}
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || FALLBACK_API_URL;

console.log('FinalAPI_BASE_URL:', API_BASE_URL);

// Browser storage utilities
const BROWSER_STORAGE_KEY = 'file_chat_files';

const getBrowserStoredFiles = (): Record<string, { filename: string; content: string; uploaded_at: number }> => {
  try {
    const stored = localStorage.getItem(BROWSER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to get browser stored files:', error);
    return {};
  }
};

const setBrowserStoredFiles = (files: Record<string, { filename: string; content: string; uploaded_at: number }>) => {
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

export const api = {
  async chat(request: ChatRequest): Promise<ReadableStream> {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to get chat response');
    }

    return response.body as ReadableStream;
  },

  async chatWithFile(request: FileChatRequest): Promise<ReadableStream> {
    const response = await fetch(`${API_BASE_URL}/api/chat-file`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to chat with file: ${errorText}`);
    }

    return response.body as ReadableStream;
  },

  async getChatHistory(): Promise<ChatHistoryResponse> {
    const response = await fetch(`${API_BASE_URL}/api/chat-history`);
    
    if (!response.ok) {
      throw new Error('Failed to get chat history');
    }

    return response.json();
  },

  async getChatSession(sessionId: string): Promise<ChatSession> {
    const response = await fetch(`${API_BASE_URL}/api/chat-history/${sessionId}`);
    
    if (!response.ok) {
      throw new Error('Failed to get chat session');
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
      throw new Error(`Failed to upload file: ${errorText}`);
    }

    const result = await response.json();

    // If the backend indicates we should use browser storage, store the file locally
    if (result.use_browser_storage && result.file_content) {
      addBrowserStoredFile(result.file_id, result.filename, result.file_content);
      
      // Trigger client-side indexing for browser-stored files
      this.indexBrowserStoredFile(result.file_id, result.filename, result.file_content);
    }

    return result;
  },

  async indexBrowserStoredFile(fileId: string, filename: string, base64Content: string): Promise<void> {
    try {
      // Convert base64 to File object
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const file = new File([bytes], filename, { type: 'application/octet-stream' });

      // Import fileProcessor dynamically to avoid SSR issues
      const { FileProcessor } = await import('@/utils/fileProcessor');
      
      // Process the file
      const { chunks, embeddings } = await FileProcessor.processFile(file);
      
      // Send pre-indexed data to backend
      const request: PreIndexedFileRequest = {
        file_id: fileId,
        filename: filename,
        chunks: chunks,
        embeddings: embeddings
      };

      const response = await fetch(`${API_BASE_URL}/api/pre-indexed-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to index browser-stored file: ${errorText}`);
      }

      console.log(`Successfully indexed browser-stored file: ${filename}`);
    } catch (error) {
      console.error('Error indexing browser-stored file:', error);
      // Don't throw here as this is called asynchronously
    }
  },

  async listFiles(): Promise<FileListResponse> {
    const response = await fetch(`${API_BASE_URL}/api/files`);
    
    if (!response.ok) {
      throw new Error('Failed to list files');
    }

    const result = await response.json();

    // If we're in read-only mode, also include browser-stored files
    const healthResponse = await this.healthCheck();
    if (healthResponse.readonly) {
      const browserFiles = getBrowserStoredFiles();
      const browserFilesList: Array<FileInfo> = [];
      
      for (const [fileId, fileData] of Object.entries(browserFiles)) {
        // Check if this file is already indexed on the backend
        let indexingStatus = 'unknown';
        let indexingMessage = 'Stored in browser';
        
        try {
          const statusResponse = await this.getFileIndexingStatus(fileId);
          indexingStatus = statusResponse.status;
          indexingMessage = statusResponse.message;
        } catch (error) {
          // File not found on backend, needs indexing
          indexingStatus = 'pending';
          indexingMessage = 'Needs indexing';
        }
        
        browserFilesList.push({
          file_id: fileId,
          original_filename: fileData.filename,
          uploaded_at: fileData.uploaded_at / 1000, // Convert to Unix timestamp
          indexing_status: indexingStatus,
          indexing_message: indexingMessage
        });
      }

      // Merge server and browser files, avoiding duplicates
      const serverFileIds = new Set(result.files.map((file: FileInfo) => file.file_id));
      const uniqueBrowserFiles: FileInfo[] = [];
      for (const file of browserFilesList) {
        if (!serverFileIds.has(file.file_id)) {
          uniqueBrowserFiles.push(file);
        }
      }
      result.files = [...result.files, ...uniqueBrowserFiles];
    }

    return result;
  },

  async getFileIndexingStatus(fileId: string): Promise<FileIndexingStatus> {
    const response = await fetch(`${API_BASE_URL}/api/files/${fileId}/status`);
    
    if (!response.ok) {
      throw new Error('Failed to get file indexing status');
    }

    return response.json();
  },

  async healthCheck(): Promise<HealthResponse> {
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
        await this.indexBrowserStoredFile(fileId, fileData.filename, fileData.content);
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
};