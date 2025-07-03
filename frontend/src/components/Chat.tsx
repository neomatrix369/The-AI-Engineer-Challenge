'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/services/api';

interface PDFFile {
  file_id: string;
  original_filename: string;
  uploaded_at: number;
  indexing_status: string;
  indexing_message: string;
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

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfs, setPdfs] = useState<PDFFile[]>([]);
  const [selectedPDFs, setSelectedPDFs] = useState<string[]>([]);
  const [chatMode, setChatMode] = useState<'general' | 'pdf'>('general');
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load PDFs and chat history on component mount
  useEffect(() => {
    loadPDFs();
    loadChatHistory();
  }, []);

  const loadPDFs = async () => {
    try {
      const response = await api.listPDFs();
      setPdfs(response.pdfs);
    } catch (error) {
      console.error('Failed to load PDFs:', error);
      setError('Failed to load PDFs');
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await api.getChatHistory();
      setChatHistory(response.sessions);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const developerMessage = `
    You are a helpful AI assistant.

    Always provide accurate, well-reasoned, and clearly explained answers. For factual or technical queries, ensure your responses are verifiable and admit uncertainty if you are unsure—never invent information. Show your reasoning step-by-step for calculations, logic, or summarization tasks.

    Adapt your style and tone to match the user's request (e.g., simple, formal, imaginative), and keep your responses within any specified length or format guidelines.

    Refuse to answer any unsafe, unethical, or harmful requests. If a prompt is ambiguous or could be interpreted in a risky way, seek clarification or respond safely.

    Remain consistent in substance when prompts are rephrased, but adjust tone and style as directed. Do not add content that is not present in the original input when rewriting or summarizing.

    Continue to excel in creative writing, summarization, and tone adaptation, while always prioritizing reliability, transparency, and user safety.

    Your responses will be vibe checked against the below Key Aspects, hence please adhere to them:
      - Factual Accuracy
      - Reasoning / Chain-of-Thought
      - Style-Guide Adherence
      - Refusal & Safety
      - Prompt Sensitivity
      - Hallucination Resistance in Rewriting

    Finally always produce a citation and/or references for the source of the information wherever possible, when not possible do mention it and why not possible.
  `

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setError('');
    const userMessage = input;
    setInput('');

    // Add user message immediately
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      let stream: ReadableStream;

      if (chatMode === 'pdf' && selectedPDFs.length > 0) {
        // Chat with PDF using RAG
        stream = await api.chatWithPDF({
          user_message: userMessage,
          pdf_file_ids: selectedPDFs,
          session_id: currentSessionId,
        });
      } else {
        // General chat
        stream = await api.chat({
          developer_message: developerMessage,
          user_message: userMessage,
        });
      }

      const reader = stream.getReader();
      let response = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        response += text;
        
        // Update the last message (AI response) in real-time
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = response;
          } else {
            newMessages.push({
              role: 'assistant',
              content: response,
              timestamp: new Date().toISOString()
            });
          }
          return newMessages;
        });
      }

      // Reload chat history after successful chat
      if (chatMode === 'pdf') {
        await loadChatHistory();
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMsg: Message = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
      setError(error instanceof Error ? error.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePDFSelection = (fileId: string, checked: boolean) => {
    if (checked) {
      setSelectedPDFs(prev => [...prev, fileId]);
    } else {
      setSelectedPDFs(prev => prev.filter(id => id !== fileId));
    }
  };

  const handleGeneralChat = () => {
    setChatMode('general');
    setSelectedPDFs([]);
    setCurrentSessionId('');
    setMessages([]);
    setError('');
  };

  const handlePDFChat = () => {
    setChatMode('pdf');
    setMessages([]);
    setCurrentSessionId('');
    setError('');
  };

  const loadChatSession = async (sessionId: string) => {
    try {
      const session = await api.getChatSession(sessionId);
      setMessages(session.messages as Message[]);
      setSelectedPDFs(session.pdf_file_ids);
      setCurrentSessionId(sessionId);
      setChatMode('pdf');
      setError('');
    } catch (error) {
      console.error('Failed to load chat session:', error);
      setError('Failed to load chat session');
    }
  };

  const startNewSession = () => {
    setMessages([]);
    setCurrentSessionId('');
    setError('');
  };

  const getSelectedPDFNames = () => {
    return selectedPDFs.map(pdfId => {
      const pdf = pdfs.find(p => p.file_id === pdfId);
      return pdf ? pdf.original_filename : pdfId;
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const readyPDFs = pdfs.filter(pdf => pdf.indexing_status === 'completed');

  return (
    <div className="flex flex-col h-[80vh] max-w-4xl mx-auto p-4">
      {/* Header with Chat Mode Selection and History */}
      <div className="mb-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={handleGeneralChat}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              chatMode === 'general'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            General Chat
          </button>
          <button
            onClick={handlePDFChat}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              chatMode === 'pdf'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Chat with PDF
          </button>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            {showHistory ? 'Hide' : 'Show'} History
          </button>
          <button
            onClick={startNewSession}
            className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
          >
            New Session
          </button>
        </div>
      </div>

      {/* Chat History Panel */}
      {showHistory && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
          <h3 className="font-medium text-gray-700 mb-2">Chat History</h3>
          {chatHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">No chat history yet</p>
          ) : (
            <div className="space-y-2">
              {chatHistory.map((session) => (
                <div
                  key={session.session_id}
                  className="flex items-center justify-between p-2 bg-white rounded border cursor-pointer hover:bg-gray-50"
                  onClick={() => loadChatSession(session.session_id)}
                >
                  <div>
                    <p className="text-sm font-medium">
                      Session {session.session_id.slice(0, 8)}...
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(session.created_at)} • {session.messages.length} messages
                    </p>
                  </div>
                  <span className="text-xs text-blue-600">Click to load</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PDF Selection (only show when in PDF mode) */}
      {chatMode === 'pdf' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select PDFs to chat with:
          </label>
          {readyPDFs.length === 0 ? (
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              No indexed PDFs available. Please upload and wait for indexing to complete.
            </div>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {readyPDFs.map((pdf) => (
                <label key={pdf.file_id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedPDFs.includes(pdf.file_id)}
                    onChange={(e) => handlePDFSelection(pdf.file_id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{pdf.original_filename}</span>
                </label>
              ))}
            </div>
          )}
          {selectedPDFs.length > 0 && (
            <div className="mt-2 text-sm text-blue-600">
              Chatting with: <strong>{getSelectedPDFNames().join(', ')}</strong>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 bg-gray-50 rounded-lg p-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            {chatMode === 'pdf' && selectedPDFs.length === 0 ? (
              <div>
                <p className="mb-2">Select one or more PDFs above to start chatting!</p>
                <p className="text-sm">You can select multiple PDFs to chat with them together.</p>
              </div>
            ) : (
              <div>
                <p className="mb-2">Start a conversation by typing a message below.</p>
                {chatMode === 'pdf' && (
                  <p className="text-sm">Your chat history will be saved automatically.</p>
                )}
              </div>
            )}
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 border'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {formatDate(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 border p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            chatMode === 'pdf' && selectedPDFs.length === 0
              ? "Select PDFs first..."
              : "Type your message..."
          }
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading || (chatMode === 'pdf' && selectedPDFs.length === 0)}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || (chatMode === 'pdf' && selectedPDFs.length === 0)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Sending...</span>
            </div>
          ) : (
            'Send'
          )}
        </button>
      </form>
    </div>
  );
}