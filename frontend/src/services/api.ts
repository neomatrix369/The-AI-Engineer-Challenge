interface ChatRequest {
  developer_message: string;
  user_message: string;
  model?: string;
}

interface PDFUploadResponse {
  filename: string;
  file_id: string;
  message: string;
  indexing_status: string;
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

const FALLBACK_API_URL = 'http://localhost:8000';
if (! process.env.NEXT_PUBLIC_API_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not set, falling back to ' + FALLBACK_API_URL);
}
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || FALLBACK_API_URL;

console.log('FinalAPI_BASE_URL:', API_BASE_URL);

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

    return response.json();
  },

  async listPDFs(): Promise<PDFListResponse> {
    const response = await fetch(`${API_BASE_URL}/api/pdfs`);
    
    if (!response.ok) {
      throw new Error('Failed to list PDFs');
    }

    return response.json();
  },

  async getPDFIndexingStatus(fileId: string): Promise<PDFIndexingStatus> {
    const response = await fetch(`${API_BASE_URL}/api/pdfs/${fileId}/status`);
    
    if (!response.ok) {
      throw new Error('Failed to get PDF indexing status');
    }

    return response.json();
  },

  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  },
};