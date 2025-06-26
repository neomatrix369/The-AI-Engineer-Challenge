'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/services/api';

export default function Chat() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
  `

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, `You: ${userMessage}`]);

    try {
      const stream = await api.chat({
        developer_message: developerMessage,
        user_message: userMessage,
      });

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
      setMessages(prev => [...prev, 'Error: Failed to get response']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[80vh] max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto mb-1 space-y-4">
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

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border rounded"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
}