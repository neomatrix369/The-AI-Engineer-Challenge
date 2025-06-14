interface ChatRequest {
  developer_message: string;
  user_message: string;
  model?: string;
}

const FALLBACK_API_URL = 'http://localhost:8000';
if (! process.env.NEXT_PUBLIC_API_URL) {
  console.log('ERROR: NEXT_PUBLIC_API_URL is not set, falling back to ' + FALLBACK_API_URL);
}
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || FALLBACK_API_URL;

export const api = {
  async chat(request: ChatRequest): Promise<ReadableStream> {
    console.log('Making API call to:', `${API_BASE_URL}/api/chat`);
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Failed to get chat response: ${response.status} ${response.statusText}`);
      }

      return response.body as ReadableStream;
    } catch (error) {
      console.error('API Call Error:', error);
      throw error;
    }
  },

  async healthCheck(): Promise<{ status: string }> {
    console.log('Making health check to:', `${API_BASE_URL}/api/health`);
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Health Check Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Health check failed: ${response.status} ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Health Check Error:', error);
      throw error;
    }
  },
};