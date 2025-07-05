'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface PDFFile {
  file_id: string;
  original_filename: string;
  uploaded_at: number;
  indexing_status: string;
  indexing_message: string;
}

export default function FileUpload() {
  const [files, setFiles] = useState<PDFFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load existing files on component mount
  useEffect(() => {
    loadFiles();
    
    // Index existing browser-stored files if in read-only mode
    const indexExistingFiles = async () => {
      try {
        await api.indexExistingBrowserStoredFiles();
        // Reload files after indexing to get updated status
        await loadFiles();
      } catch (error) {
        console.error('Failed to index existing browser-stored files:', error);
      }
    };
    
    indexExistingFiles();
  }, []);

  // Set up polling for indexing status updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Only poll if there are files that are still being indexed
      const hasIndexingFiles = files.some(file => 
        file.indexing_status === 'pending' || file.indexing_status === 'indexing'
      );
      
      if (hasIndexingFiles) {
        loadFiles();
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [files]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const response = await api.listFiles();
      setFiles(response.files);
    } catch (error) {
      console.error('Failed to load files:', error);
      setUploadMessage('Failed to load existing files');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const supportedExtensions = ['.pdf', '.md', '.txt'];
    const fileExtension = '.' + file.name.toLowerCase().split('.').pop();
    if (!supportedExtensions.includes(fileExtension)) {
      setUploadMessage('Please select a PDF, Markdown, or Text file');
      return;
    }

    try {
      setIsUploading(true);
      setUploadMessage('');
      
      const response = await api.uploadFile(file);
      setUploadMessage(`Successfully uploaded: ${response.filename}. Indexing will start shortly...`);
      
      // Reload the file list
      await loadFiles();
      
      // Clear the file input
      event.target.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadMessage(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case 'indexing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Indexing
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Ready
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">File Upload</h2>
      
      {/* Upload Section */}
      <div className="mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".pdf,.md,.txt"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
              isUploading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isUploading ? 'Uploading...' : 'Choose File'}
          </label>
          <p className="mt-2 text-sm text-gray-500">
            Click to select a PDF, Markdown, or Text file to upload
          </p>
        </div>
        
        {uploadMessage && (
          <div className={`mt-4 p-3 rounded-md ${
            uploadMessage.includes('Successfully') 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {uploadMessage}
          </div>
        )}
      </div>

      {/* File List Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Uploaded Files</h3>
        
        {isLoading ? (
          <div className="text-center py-4">
            <p className="text-gray-500">Loading files...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No files uploaded yet</p>
            <p className="text-sm text-gray-400 mt-1">Upload your first file above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.file_id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{file.original_filename}</p>
                  <p className="text-sm text-gray-500">
                    Uploaded: {formatDate(file.uploaded_at)}
                  </p>
                  {(file.indexing_status === 'pending' || file.indexing_status === 'indexing') && (
                    <p className="text-sm text-blue-600 mt-1">
                      {file.indexing_message}
                    </p>
                  )}
                  {file.indexing_status === 'failed' && (
                    <p className="text-sm text-red-600 mt-1">
                      {file.indexing_message}
                    </p>
                  )}
                </div>
                <div className="ml-4">
                  {getStatusBadge(file.indexing_status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 