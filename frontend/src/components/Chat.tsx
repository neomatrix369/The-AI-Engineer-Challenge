'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/services/api';
import type { ChatSession, FileInfo } from '@/services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatProps {
  fileListVersion?: number;
}

// File type guidance data
interface FileTypeGuidance {
  title: string;
  description: string;
  tips: string[];
  examples: string[];
  personas: {
    [persona: string]: {
      description: string;
      tips: string[];
      examples: string[];
    };
  };
}

const FILE_TYPE_GUIDANCE: Record<string, FileTypeGuidance> = {
  pdf: {
    title: "PDF Documents",
    description: "PDF files contain formatted documents, reports, research papers, and other structured content.",
    tips: [
      "Ask about specific sections, chapters, or page numbers",
      "Request summaries of key findings or conclusions",
      "Ask for data extraction from tables or charts",
      "Inquire about methodology, results, or recommendations",
      "Request comparisons between different sections"
    ],
    examples: [
      "What are the main findings in this research paper?",
      "Summarize the methodology section",
      "What data is presented in the tables?",
      "What are the key recommendations?"
    ],
    personas: {
      researcher: {
        description: "Research-focused analysis and academic insights",
        tips: [
          "Ask for methodology validation and research gaps",
          "Request literature review connections",
          "Inquire about statistical significance and sample sizes",
          "Ask for comparative analysis with other studies"
        ],
        examples: [
          "What are the limitations of this study?",
          "How does this compare to similar research?",
          "What are the implications for future research?"
        ]
      },
      business: {
        description: "Business insights and actionable recommendations",
        tips: [
          "Ask for executive summaries and key takeaways",
          "Request ROI analysis and business impact",
          "Inquire about market implications and trends",
          "Ask for strategic recommendations and next steps"
        ],
        examples: [
          "What are the key business insights?",
          "What are the strategic implications?",
          "What actions should we take based on this?"
        ]
      },
      student: {
        description: "Educational content and learning objectives",
        tips: [
          "Ask for concept explanations and definitions",
          "Request study guides and key points",
          "Inquire about practical applications and examples",
          "Ask for quiz questions and self-assessment"
        ],
        examples: [
          "Can you explain the main concepts?",
          "What are the key points to remember?",
          "How can I apply this in practice?"
        ]
      }
    }
  },
  csv: {
    title: "CSV Data Files",
    description: "CSV files contain structured data in tabular format, perfect for data analysis and insights.",
    tips: [
      "Ask for data summaries and statistics",
      "Request trend analysis and patterns",
      "Ask about specific columns or data relationships",
      "Request data filtering and sorting insights",
      "Ask for data quality assessments"
    ],
    examples: [
      "What are the main trends in this dataset?",
      "Show me statistics for the sales column",
      "What patterns do you see in the data?",
      "Are there any outliers or anomalies?"
    ],
    personas: {
      analyst: {
        description: "Data analysis and business intelligence",
        tips: [
          "Ask for statistical analysis and correlations",
          "Request data visualization suggestions",
          "Inquire about data quality and cleaning needs",
          "Ask for predictive insights and trends"
        ],
        examples: [
          "What correlations exist between variables?",
          "What insights can we extract from this data?",
          "How should we visualize these findings?"
        ]
      },
      manager: {
        description: "High-level insights and decision support",
        tips: [
          "Ask for executive summaries and KPIs",
          "Request performance metrics and benchmarks",
          "Inquire about actionable insights and recommendations",
          "Ask for risk assessment and opportunities"
        ],
        examples: [
          "What are the key performance indicators?",
          "What decisions should we make based on this?",
          "What are the main opportunities and risks?"
        ]
      },
      developer: {
        description: "Technical data processing and integration",
        tips: [
          "Ask for data structure and schema analysis",
          "Request data transformation suggestions",
          "Inquire about API integration possibilities",
          "Ask for data validation and error handling"
        ],
        examples: [
          "What's the optimal data structure for this?",
          "How should we process this data programmatically?",
          "What validation rules should we implement?"
        ]
      }
    }
  },
  json: {
    title: "JSON Data Files",
    description: "JSON files contain structured data in a hierarchical format, often used for APIs and configuration.",
    tips: [
      "Ask about data structure and hierarchy",
      "Request specific field values or nested data",
      "Ask for data validation and schema analysis",
      "Request data transformation suggestions",
      "Ask about API endpoints or configuration details"
    ],
    examples: [
      "What is the structure of this JSON data?",
      "Show me all user IDs in the data",
      "What configuration options are available?",
      "Are there any missing required fields?"
    ],
    personas: {
      developer: {
        description: "Technical implementation and API integration",
        tips: [
          "Ask for API endpoint documentation",
          "Request data model and schema analysis",
          "Inquire about error handling and validation",
          "Ask for integration patterns and best practices"
        ],
        examples: [
          "How should I structure the API calls?",
          "What's the data model for this JSON?",
          "How should I handle errors and edge cases?"
        ]
      },
      architect: {
        description: "System design and architecture decisions",
        tips: [
          "Ask for scalability and performance considerations",
          "Request data flow and integration patterns",
          "Inquire about security and compliance requirements",
          "Ask for system design recommendations"
        ],
        examples: [
          "How should we architect this data flow?",
          "What are the performance implications?",
          "How should we secure this data?"
        ]
      },
      analyst: {
        description: "Data analysis and business insights",
        tips: [
          "Ask for data extraction and transformation",
          "Request business logic and rules analysis",
          "Inquire about data relationships and dependencies",
          "Ask for reporting and visualization suggestions"
        ],
        examples: [
          "What business rules are encoded here?",
          "How can we extract insights from this data?",
          "What reports can we generate from this?"
        ]
      }
    }
  },
  text: {
    title: "Text & Markdown Files",
    description: "Text and Markdown files contain plain text content, documentation, notes, and formatted text.",
    tips: [
      "Ask for content summaries and key points",
      "Request code explanations and documentation",
      "Ask about specific topics or sections",
      "Request formatting and structure analysis",
      "Ask for content organization suggestions"
    ],
    examples: [
      "Summarize the main points of this document",
      "Explain the code examples in this file",
      "What are the key topics covered?",
      "How is this content organized?"
    ],
    personas: {
      writer: {
        description: "Content creation and documentation",
        tips: [
          "Ask for content structure and organization",
          "Request writing style and tone analysis",
          "Inquire about audience engagement and clarity",
          "Ask for content improvement suggestions"
        ],
        examples: [
          "How can I improve the structure of this?",
          "What's the writing style and tone?",
          "How can I make this more engaging?"
        ]
      },
      developer: {
        description: "Technical documentation and code analysis",
        tips: [
          "Ask for code documentation and explanations",
          "Request technical specification analysis",
          "Inquire about implementation details and patterns",
          "Ask for code review and improvement suggestions"
        ],
        examples: [
          "Can you explain this code section?",
          "What are the technical requirements?",
          "How can I improve this implementation?"
        ]
      },
      student: {
        description: "Learning and educational content",
        tips: [
          "Ask for concept explanations and definitions",
          "Request study guides and learning objectives",
          "Inquire about practical applications and examples",
          "Ask for knowledge assessment and quizzes"
        ],
        examples: [
          "Can you explain the main concepts?",
          "What should I focus on learning?",
          "How can I apply this knowledge?"
        ]
      }
    }
  }
};

export default function Chat({ fileListVersion = 0 }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [chatMode, setChatMode] = useState<'general' | 'file'>('general');
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showPromptHint, setShowPromptHint] = useState(false);
  const [showFileGuidance, setShowFileGuidance] = useState(true);
  const [selectedPersona, setSelectedPersona] = useState<string>('general');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load files and chat history on component mount
  useEffect(() => {
    loadFiles();
    loadChatHistory();
  }, []);

  // Reload files when fileListVersion changes (files deleted in Upload tab)
  useEffect(() => {
    if (fileListVersion > 0) {
      loadFiles();
    }
  }, [fileListVersion]);

  // Helper function to get file type from filename
  const getFileType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop() || '';
    if (ext === 'pdf') return 'pdf';
    if (ext === 'csv') return 'csv';
    if (ext === 'json') return 'json';
    if (['md', 'txt'].includes(ext)) return 'text';
    return 'unknown';
  };

  // Helper function to get unique file types from selected files
  const getSelectedFileTypes = (): string[] => {
    const fileTypes = selectedFiles.map(fileId => {
      const file = files.find(f => f.file_id === fileId);
      return file ? getFileType(file.original_filename) : 'unknown';
    });
    return Array.from(new Set(fileTypes)).filter(type => type !== 'unknown');
  };

  // Helper function to get guidance for file types
  const getFileTypeGuidance = (): FileTypeGuidance[] => {
    const fileTypes = getSelectedFileTypes();
    return fileTypes.map(type => FILE_TYPE_GUIDANCE[type]).filter(Boolean);
  };

  const loadFiles = async () => {
    try {
      const response = await api.listFiles();
      setFiles(response.files);
    } catch (error) {
      console.error('Failed to load files:', error);
      setError('Failed to load files');
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
  
   - Only answer questions using information from the provided context
   - If the context doesn't contain relevant information, respond with "I don't know"
   - Be accurate and cite specific parts of the context when possible
   - Always use the provided context, only use external knowledge when not possible to answer the question from the context.
   - Only provide answers when you are confident the context supports your response (when using external knowledge, do specify this in the response).
   - Always provide accurate, well-reasoned, and clearly explained answers. For factual or technical queries, ensure your responses are verifiable and admit uncertainty if you are unsure—never invent information. Show your reasoning step-by-step for calculations, logic, or summarization tasks.
   - Adapt your style and tone to match the user's request (e.g., simple, formal, imaginative), and keep your responses within any specified length or format guidelines.
   - Refuse to answer any unsafe, unethical, or harmful requests. If a prompt is ambiguous or could be interpreted in a risky way, seek clarification or respond safely.
   - Remain consistent in substance when prompts are rephrased, but adjust tone and style as directed. Do not add content that is not present in the original input when rewriting or summarizing.
   - Continue to excel in creative writing, summarization, and tone adaptation, while always prioritizing reliability, transparency, and user safety.

    Your responses will be vibe checked against the below Key Aspects, hence please adhere to them:
      - Factual Accuracy
      - Reasoning / Chain-of-Thought
      - Style-Guide Adherence
      - Refusal & Safety
      - Prompt Sensitivity
      - Hallucination Resistance in Rewriting

    Finally always produce a citation and/or references for the source of the information wherever possible, when not possible do mention it and why not possible.
  `

  // Template for file chat system prompt
  const fileChatPromptTemplate = `You are a helpful AI assistant that answers questions based on the provided file content.\n\nFile Sources: [selected files]\n\nFile Context: [relevant chunks]\n\nInstructions:\n- Answer questions based ONLY on the information provided in the file context above\n- If the question cannot be answered from the file content, say \"I cannot answer this question based on the provided file content\"\n- Be accurate and helpful\n- Cite specific parts of the files when possible\n- If multiple files are referenced, specify which file contains the information`;

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

      if (chatMode === 'file' && selectedFiles.length > 0) {
        // Chat with files using RAG
        stream = await api.chatWithFile({
          user_message: userMessage,
          file_ids: selectedFiles,
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
      if (chatMode === 'file') {
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

  const handleFileSelection = (fileId: string, checked: boolean) => {
    if (checked) {
      setSelectedFiles(prev => [...prev, fileId]);
    } else {
      setSelectedFiles(prev => prev.filter(id => id !== fileId));
    }
  };

  const handleGeneralChat = () => {
    setChatMode('general');
    setSelectedFiles([]);
    setCurrentSessionId('');
    setMessages([]);
    setError('');
  };

  const handleFileChat = () => {
    setChatMode('file');
    setMessages([]);
    setCurrentSessionId('');
    setError('');
  };

  const loadChatSession = async (sessionId: string) => {
    try {
      const session = await api.getChatSession(sessionId);
      setMessages(session.messages as Message[]);
      setSelectedFiles(session.file_ids);
      setCurrentSessionId(sessionId);
      setChatMode('file');
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

  const getSelectedFileNames = () => {
    return selectedFiles.map(fileId => {
      const file = files.find(f => f.file_id === fileId);
      return file ? file.original_filename : fileId;
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const readyFiles = files.filter(file => file.indexing_status === 'completed');

  return (
    <div className="flex flex-col h-[80vh] max-w-4xl mx-auto p-4">
      {/* Header with Chat Mode Selection, History, and Prompt Hint */}
      <div className="mb-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 items-center">
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
            onClick={handleFileChat}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              chatMode === 'file'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Chat with File
          </button>
          {/* Prompt Hint Icon */}
          <button
            type="button"
            aria-label="Show system/developer prompt"
            className="ml-2 p-2 rounded-full hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            onClick={() => setShowPromptHint(true)}
          >
            {/* Info icon SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-600">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 9.75h.008v.008H11.25V9.75zm0 3.75h.008v3.75H11.25V13.5zm.75-9a9 9 0 110 18 9 9 0 010-18z" />
            </svg>
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

      {/* Prompt Hint Modal */}
      {showPromptHint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              aria-label="Close prompt hint"
              onClick={() => setShowPromptHint(false)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold mb-2 text-blue-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 9.75h.008v.008H11.25V9.75zm0 3.75h.008v3.75H11.25V13.5zm.75-9a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
              System/Developer Prompt
            </h2>
            <div className="max-h-80 overflow-y-auto text-sm whitespace-pre-wrap text-gray-800 bg-gray-50 rounded p-3 border">
              {chatMode === 'general' ? (
                <>{developerMessage}</>
              ) : (
                <>{fileChatPromptTemplate}</>
              )}
            </div>
            <div className="mt-4 text-xs text-gray-500">
              This is the system/developer prompt sent to the LLM for this chat mode.
            </div>
          </div>
        </div>
      )}

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

      {/* File Selection (only show when in file mode) */}
      {chatMode === 'file' && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Files to chat with:
          </label>
          {readyFiles.length === 0 ? (
            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              No indexed files available. Please upload and wait for indexing to complete.
            </div>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {readyFiles.map((file) => (
                <label key={file.file_id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFiles.includes(file.file_id)}
                    onChange={(e) => handleFileSelection(file.file_id, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{file.original_filename}</span>
                </label>
              ))}
            </div>
          )}
          {selectedFiles.length > 0 && (
            <div className="mt-2 text-sm text-blue-600">
              Chatting with: <strong>{getSelectedFileNames().join(', ')}</strong>
            </div>
          )}
        </div>
      )}

      {/* File Type Guidance (only show when files are selected in file mode) */}
      {chatMode === 'file' && selectedFiles.length > 0 && (
        <div className="mb-4">
          {/* Guidance Toggle Button */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-700">File Type Guidance (for different personas i.e. General User, Business, Developer, Write, etc...)</h3>
            <button
              onClick={() => setShowFileGuidance(!showFileGuidance)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              {showFileGuidance ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                  </svg>
                  Hide Guidance
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Show Guidance
                </>
              )}
            </button>
          </div>

          {/* Collapsible Guidance Content */}
          {showFileGuidance && (
            <div className="space-y-3">
              {/* Persona Selector */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-gray-600">View as:</span>
                <select
                  value={selectedPersona}
                  onChange={(e) => setSelectedPersona(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
                >
                  <option value="general">General User</option>
                  {getFileTypeGuidance().map((guidance) => 
                    Object.keys(guidance.personas).map((persona) => (
                      <option key={persona} value={persona}>
                        {persona.charAt(0).toUpperCase() + persona.slice(1)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {getFileTypeGuidance().map((guidance, index) => {
                const personaData = guidance.personas[selectedPersona];
                const isGeneral = selectedPersona === 'general';
                
                return (
                  <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                      </svg>
                      <h3 className="text-sm font-semibold text-blue-800">{guidance.title}</h3>
                      {!isGeneral && personaData && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                          {selectedPersona.charAt(0).toUpperCase() + selectedPersona.slice(1)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-blue-700 mb-3">
                      {isGeneral ? guidance.description : personaData?.description || guidance.description}
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-medium text-blue-800 mb-2">💡 Helpful Tips:</h4>
                        <ul className="text-xs text-blue-700 space-y-1">
                          {(isGeneral ? guidance.tips : personaData?.tips || guidance.tips).map((tip, tipIndex) => (
                            <li key={tipIndex} className="flex items-start gap-1">
                              <span className="text-blue-500 mt-1">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-medium text-blue-800 mb-2">💬 Example Questions:</h4>
                        <ul className="text-xs text-blue-700 space-y-1">
                          {(isGeneral ? guidance.examples : personaData?.examples || guidance.examples).map((example, exampleIndex) => (
                            <li key={exampleIndex} className="flex items-start gap-1">
                              <span className="text-blue-500 mt-1">•</span>
                              <span className="italic">"{example}"</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
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
            {chatMode === 'file' && selectedFiles.length === 0 ? (
              <div>
                <p className="mb-2">Select one or more files above to start chatting!</p>
                <p className="text-sm">You can select multiple files to chat with them together.</p>
              </div>
            ) : (
              <div>
                <p className="mb-2">Start a conversation by typing a message below.</p>
                {chatMode === 'file' && (
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
            chatMode === 'file' && selectedFiles.length === 0
              ? "Select files first..."
              : "Type your message..."
          }
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading || (chatMode === 'file' && selectedFiles.length === 0)}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || (chatMode === 'file' && selectedFiles.length === 0)}
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