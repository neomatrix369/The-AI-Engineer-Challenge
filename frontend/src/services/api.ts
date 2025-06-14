interface ChatRequest {
  developer_message: string;
  user_message: string;
  model?: string;
}

const FALLBACK_API_URL = 'http://localhost:8000';
if (! process.env.NEXT_PUBLIC_API_URL) {
  console.warn('NEXT_PUBLIC_API_URL is not set, falling back to ' + FALLBACK_API_URL);
}
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || FALLBACK_API_URL;

console.log('FinalAPI_BASE_URL:', API_BASE_URL);

// URL formatting utility
const formatApiUrl = (endpoint: string): string => {
  // Remove trailing slash if present
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;

  // Remove /api suffix if present
  const cleanBase = base.endsWith('/api') ? base.slice(0, -4) : base;

  // Ensure endpoint starts with /
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Construct final URL
  return `${cleanBase}/api${cleanEndpoint}`;
};

// Error logging utility with Vercel logging
const logError = (context: string, error: any) => {
  const errorDetails = {
    timestamp: new Date().toISOString(),
    context,
    message: error.message,
    stack: error.stack,
    url: API_BASE_URL,
    environment: process.env.NODE_ENV
  };

  // Log to browser console
  console.error(`[${context}] Error:`, errorDetails);

  // Log to Vercel
  if (typeof window !== 'undefined') {
    // @ts-ignore - Vercel Analytics types
    window.va?.track('error', {
      ...errorDetails,
      errorName: error.name,
      errorMessage: error.message
    });
  }
};

// Success logging utility
const logSuccess = (context: string, data: any) => {
  const successDetails = {
    timestamp: new Date().toISOString(),
    context,
    data
  };

  // Log to browser console
  console.log(`[${context}] Success:`, successDetails);

  // Log to Vercel
  if (typeof window !== 'undefined') {
    // @ts-ignore - Vercel Analytics types
    window.va?.track('success', successDetails);
  }
};

export const api = {
  async chat(request: ChatRequest): Promise<ReadableStream> {
    const url = formatApiUrl('/chat');
    console.log('Making API call to:', url);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`API Error: ${response.status} ${response.statusText}`);
        logError('chat', {
          ...error,
          status: response.status,
          statusText: response.statusText,
          responseBody: errorText,
          requestBody: request
        });
        throw error;
      }

      logSuccess('chat', {
        status: response.status,
        requestBody: request
      });

      return response.body as ReadableStream;
    } catch (error) {
      logError('chat', error);
      throw error;
    }
  },

  async healthCheck(): Promise<{ status: string }> {
    const url = formatApiUrl('/health');
    console.log('Making health check to:', url);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`Health Check Error: ${response.status} ${response.statusText}`);
        logError('healthCheck', {
          ...error,
          status: response.status,
          statusText: response.statusText,
          responseBody: errorText
        });
        throw error;
      }

      const data = await response.json();
      logSuccess('healthCheck', { status: response.status, data });
      return data;
    } catch (error) {
      logError('healthCheck', error);
      throw error;
    }
  },
};