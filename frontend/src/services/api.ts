interface ChatRequest {
  developer_message: string;
  user_message: string;
  model?: string;
}

interface PDFChatRequest {
  user_message: string;
  pdf_file_ids: string[];
  session_id?: string;
  model?: string;
}

interface ChatSession {
  session_id: string;
  created_at: string;
  pdf_file_ids: string[];
  messages: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
}

interface ChatHistoryResponse {
  sessions: ChatSession[];
}

interface PDFUploadResponse {
  filename: string;
  file_id: string;
  message: string;
  indexing_status: string;
  use_browser_storage: boolean;
  file_content?: string; // Base64 encoded file content for browser storage
}

interface PDFFile {
  file_id: string;
  original_filename: string;
  uploaded_at: number;
  indexing_status: string;
  indexing_message: string;
}

interface PDFListResponse {
  pdfs: PDFFile[];
}

interface PDFIndexingStatus {
  file_id: string;
  status: string;
  message: string;
}

interface HealthResponse {
  status: string;
  readonly: boolean;
}

const FALLBACK_API_URL = 'http://localhost:8000';
if (! process.env.NEXT_PUBLIC_API_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not set, falling back to ' + FALLBACK_API_URL);
}
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || FALLBACK_API_URL;

console.log('FinalAPI_BASE_URL:', API_BASE_URL);

// Browser storage utilities
const BROWSER_STORAGE_KEY = 'pdf_chat_files';

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

  async chatWithPDF(request: PDFChatRequest): Promise<ReadableStream> {
    const response = await fetch(`${API_BASE_URL}/api/chat-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to chat with PDF: ${errorText}`);
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

  async uploadPDF(file: File): Promise<PDFUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/api/upload-pdf`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload PDF: ${errorText}`);
    }

    const result = await response.json();

    // If the backend indicates we should use browser storage, store the file locally
    if (result.use_browser_storage && result.file_content) {
      addBrowserStoredFile(result.file_id, result.filename, result.file_content);
    }

    return result;
  },

  async listPDFs(): Promise<PDFListResponse> {
    const response = await fetch(`${API_BASE_URL}/api/pdfs`);
    
    if (!response.ok) {
      throw new Error('Failed to list PDFs');
    }

    const result = await response.json();

    // If we're in read-only mode, also include browser-stored files
    const healthResponse = await this.healthCheck();
    if (healthResponse.readonly) {
      const browserFiles = getBrowserStoredFiles();
      const browserPDFs: Array<PDFFile> = Object.entries(browserFiles).map(([fileId, fileData]): PDFFile => ({
        file_id: fileId,
        original_filename: fileData.filename,
        uploaded_at: fileData.uploaded_at / 1000, // Convert to Unix timestamp
        indexing_status: 'completed', // Assume completed for browser-stored files
        indexing_message: 'Stored in browser'
      }));

      // Merge server and browser files, avoiding duplicates
      const serverFileIds = new Set(result.pdfs.map(pdf => pdf.file_id));
      const uniqueBrowserPDFs: PDFFile[] = [];
      for (const pdf of browserPDFs) {
        if (!serverFileIds.has(pdf.file_id)) {
          uniqueBrowserPDFs.push(pdf);
        }
      }
      result.pdfs = [...result.pdfs, ...uniqueBrowserPDFs];
    }

    return result;
  },

  async getPDFIndexingStatus(fileId: string): Promise<PDFIndexingStatus> {
    const response = await fetch(`${API_BASE_URL}/api/pdfs/${fileId}/status`);
    
    if (!response.ok) {
      throw new Error('Failed to get PDF indexing status');
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

  // Browser storage utilities
  getBrowserStoredFiles,
  setBrowserStoredFiles,
  addBrowserStoredFile,
  removeBrowserStoredFile,
};