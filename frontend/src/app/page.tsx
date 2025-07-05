'use client';

import { useState } from 'react';
import Chat from '@/components/Chat';
import FileUpload from '@/components/FileUpload';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'upload' | 'chat'>('upload');

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          AI Document Chat Interface
        </h1>
        
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex bg-white rounded-lg shadow-sm border">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-6 py-3 rounded-l-lg font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:text-gray-800'
              }`}
            >
              Upload Files
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-3 rounded-r-lg font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:text-gray-800'
              }`}
            >
              Chat
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {activeTab === 'upload' ? (
            <FileUpload />
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold mb-6 text-gray-800">AI Chat</h2>
              <Chat />
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
