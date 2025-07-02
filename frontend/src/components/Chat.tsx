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

export default function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pdfs, setPdfs] = useState<PDFFile[]>([]);
  const [selectedPDF, setSelectedPDF] = useState<string>('');
  const [chatMode, setChatMode] = useState<'general' | 'pdf'>('general');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load PDFs on component mount
  useEffect(() => {
    loadPDFs();
  }, []);

  const loadPDFs = async () => {
    try {
      const response = await api.listPDFs();
      setPdfs(response.pdfs);
    } catch (error) {
      console.error('Failed to load PDFs:', error);
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
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, `You: ${userMessage}`]);

    try {
      let stream: ReadableStream;

      if (chatMode === 'pdf' && selectedPDF) {
        // Chat with PDF using RAG
        stream = await api.chatWithPDF({
          user_message: userMessage,
          pdf_file_id: selectedPDF,
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
        setMessages(prev => {
          const newMessages = [...prev];
          if (newMessages[newMessages.length - 1].startsWith('AI:')) {
            newMessages[newMessages.length - 1] = `AI: ${response}`;
          } else {
            newMessages.push(`AI: ${response}`);
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, `Error: Failed to get response`]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePDFSelection = (fileId: string) => {
    setSelectedPDF(fileId);
    setChatMode('pdf');
    setMessages([]); // Clear chat history when switching PDFs
  };

  const handleGeneralChat = () => {
    setChatMode('general');
    setSelectedPDF('');
    setMessages([]); // Clear chat history when switching modes
  };

  const getSelectedPDFName = () => {
    if (!selectedPDF) return '';
    const pdf = pdfs.find(p => p.file_id === selectedPDF);
    return pdf ? pdf.original_filename : '';
  };

  const readyPDFs = pdfs.filter(pdf => pdf.indexing_status === 'completed');

  return (
    <div className="flex flex-col h-[80vh] max-w-2xl mx-auto p-4">
      {/* Chat Mode Selection */}
      <div className="mb-4 flex gap-2">
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
          onClick={() => setChatMode('pdf')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            chatMode === 'pdf'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Chat with PDF
        </button>
      </div>

      {/* PDF Selection (only show when in PDF mode) */}
      {chatMode === 'pdf' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select a PDF to chat with:
          </label>
          {readyPDFs.length === 0 ? (
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              No indexed PDFs available. Please upload and wait for indexing to complete.
            </div>
          ) : (
            <select
              value={selectedPDF}
              onChange={(e) => handlePDFSelection(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a PDF...</option>
              {readyPDFs.map((pdf) => (
                <option key={pdf.file_id} value={pdf.file_id}>
                  {pdf.original_filename}
                </option>
              ))}
            </select>
          )}
          {selectedPDF && (
            <div className="mt-2 text-sm text-blue-600">
              Chatting with: <strong>{getSelectedPDFName()}</strong>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-1 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            {chatMode === 'pdf' && !selectedPDF ? (
              <p>Select a PDF above to start chatting with it!</p>
            ) : (
              <p>Start a conversation by typing a message below.</p>
            )}
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg ${
              message.startsWith('You:')
                ? 'bg-blue-100 ml-auto'
                : 'bg-gray-100'
            } max-w-[80%]`}
          >
            {message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            chatMode === 'pdf' && !selectedPDF
              ? "Select a PDF first..."
              : "Type your message..."
          }
          className="flex-1 p-2 border rounded"
          disabled={isLoading || (chatMode === 'pdf' && !selectedPDF)}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || (chatMode === 'pdf' && !selectedPDF)}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}