'use client';

import { useState, useEffect } from 'react';
import { api, getBrowserStoredFiles, setBrowserStoredFiles } from '@/services/api';
import type { FileInfo } from '@/services/api';
import { getEnvironmentConfig } from '@/config/features';

interface FileUploadProps {
  onFileListChange?: () => void;
}

// Helper to store file metadata in browser storage
function storeFileMetadataInBrowser(fileId: string, filename: string, vectorStoreType: string) {
  const files = getBrowserStoredFiles();
  files[fileId] = {
    ...files[fileId],
    filename,
    vector_store_type: vectorStoreType,
    uploaded_at: Date.now(),
  };
  setBrowserStoredFiles(files);
}

// Helper to remove file metadata from browser storage
function removeFileMetadataFromBrowser(fileId: string) {
  const files = getBrowserStoredFiles();
  delete files[fileId];
  setBrowserStoredFiles(files);
}

export default function FileUpload({ onFileListChange }: FileUploadProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [browserFiles, setBrowserFiles] = useState<Record<string, any>>({});

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

  // Load browser-stored files on mount
  useEffect(() => {
    setBrowserFiles(getBrowserStoredFiles());
  }, []);

  // Set up polling for indexing status updates
  useEffect(() => {
    const interval = setInterval(async () => {
      // Only poll if there are files that are still being indexed
      const hasIndexingFiles = files && files.length > 0 && files.some(file => 
        file.indexing_status === 'pending' || file.indexing_status === 'indexing'
      );
      
      if (hasIndexingFiles) {
        // Check status without full reload to avoid flickering
        try {
          const newFiles = await api.listFiles();
          
          // Update files while preserving real filenames
          setFiles(prevFiles => {
            return prevFiles.map(prevFile => {
              const newFile = newFiles.find((f: FileInfo) => f.file_id === prevFile.file_id);
              if (newFile) {
                // Preserve the real filename if we have it, otherwise use the backend filename
                const realFilename = prevFile.filename && !prevFile.filename.startsWith('File_') 
                  ? prevFile.filename 
                  : newFile.filename;
                
                // Preserve the vector store type if we have it, otherwise use the backend value
                const realVectorStoreType = prevFile.vector_store_type && prevFile.vector_store_type !== 'Unknown'
                  ? prevFile.vector_store_type
                  : newFile.vector_store_type;
                
                return {
                  ...newFile,
                  filename: realFilename,
                  vector_store_type: realVectorStoreType
                };
              }
              return prevFile;
            });
          });
        } catch (error) {
          console.error('Failed to check file status:', error);
        }
      }
    }, 3000); // Poll every 3 seconds instead of 2

    return () => clearInterval(interval);
  }, [files]);

  // Enhance: On every file list load, merge backend and browser-stored metadata
  const mergeFilesWithBrowserMetadata = (backendFiles: FileInfo[]) => {
    const browserFiles = getBrowserStoredFiles();
    console.log('🔍 Browser files:', browserFiles);
    return backendFiles.map(file => {
      const browserMeta = browserFiles[file.file_id];
      console.log(`🔍 File ${file.file_id}:`, {
        backend_filename: file.filename,
        backend_vector_store: file.vector_store_type,
        browser_filename: browserMeta?.filename,
        browser_vector_store: browserMeta?.vector_store_type
      });
      return {
        ...file,
        filename: (file.filename && !file.filename.startsWith('File_')) ? file.filename : (browserMeta?.filename || file.filename),
        vector_store_type: (file.vector_store_type && file.vector_store_type !== 'Unknown') ? file.vector_store_type : (browserMeta?.vector_store_type || file.vector_store_type),
      };
    });
  };

  // Update loadFiles to use merge
  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const files = await api.listFiles();
      const mergedFiles = mergeFilesWithBrowserMetadata(files);
      setFiles(mergedFiles);
    } catch (error) {
      console.error('Failed to load files:', error);
      setUploadMessage('Failed to load existing files');
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  // On upload, store metadata in browser storage
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const supportedExtensions = ['.pdf', '.md', '.txt', '.csv', '.json'];
    const fileExtension = '.' + file.name.toLowerCase().split('.').pop();
    if (!supportedExtensions.includes(fileExtension)) {
      setUploadMessage('Please select a PDF, Markdown, Text, CSV, or JSON file');
      return;
    }

    try {
      setIsUploading(true);
      setUploadMessage('');
      
      const response = await api.uploadFile(file);
      console.log('📤 Upload response:', response);
      setUploadMessage(`Successfully uploaded: ${response.filename}. Indexing will start shortly...`);
      
      // Store metadata in browser storage
      storeFileMetadataInBrowser(response.file_id, response.filename, response.vector_store_type);
      console.log('💾 Stored in browser:', response.file_id, response.filename, response.vector_store_type);
      
      // Add the new file to the local state immediately with the real filename
      const newFile: FileInfo = {
        file_id: response.file_id,
        filename: response.filename,
        indexing_status: response.indexing_status,
        message: response.message,
        vector_store_type: response.vector_store_type
      };
      setFiles(prev => [...prev, newFile]);
      event.target.value = '';
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadMessage(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // On delete, remove metadata from browser storage
  const handleDeleteFile = async (fileId: string) => {
    try {
      setIsDeleting(true);
      await api.deleteFile(fileId);
      setFiles(prev => prev.filter(file => file.file_id !== fileId));
      setUploadMessage(`File deleted successfully`);
      setTimeout(() => setUploadMessage(''), 3000);
      onFileListChange?.();
      removeFileMetadataFromBrowser(fileId);
    } catch (error) {
      console.error('Failed to delete file:', error);
      setUploadMessage(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // On delete all, remove all browser metadata
  const handleDeleteAllFiles = async () => {
    if (!confirm('Are you sure you want to delete all files? This action cannot be undone.')) {
      return;
    }
    try {
      setIsDeleting(true);
      const deletePromises = files && files.map(file => api.deleteFile(file.file_id));
      if (deletePromises) {
        await Promise.all(deletePromises);
      }
      setFiles([]);
      setUploadMessage(`All files deleted successfully`);
      setTimeout(() => setUploadMessage(''), 3000);
      onFileListChange?.();
      setBrowserStoredFiles({});
    } catch (error) {
      console.error('Failed to delete all files:', error);
      setUploadMessage(`Failed to delete all files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Indexing
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
      case 'unknown':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
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

  const envConfig = getEnvironmentConfig();

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">File Upload</h2>
        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
          <span className="flex items-center">
            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
            {envConfig.getEnvironmentDescription()}
          </span>
          <span className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            {envConfig.getStorageDescription()}
          </span>
        </div>
      </div>
      
      {/* Upload Section */}
      <div className="mb-8">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept=".pdf,.md,.txt,.csv,.json"
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
            Click to select a PDF, Markdown, Text, CSV, or JSON file to upload
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Uploaded Files</h3>
          {files && files.length > 0 && (
            <button
              onClick={handleDeleteAllFiles}
              disabled={isDeleting}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Delete all files"
            >
              Delete All
            </button>
          )}
        </div>
        
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
            {files && files.map((file) => {
              return (
                <div
                  key={file.file_id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {file.filename || '(Indexing or unknown filename)'}
                    </p>
                    <p className="text-sm text-gray-500">
                      Type: {file.filename ? file.filename.split('.').pop()?.toUpperCase() || 'Unknown' : 'Unknown' }
                    </p>
                    {(file.indexing_status === 'pending' || file.indexing_status === 'indexing') && (
                      <p className="text-sm text-blue-600 mt-1">
                        {file.message}
                      </p>
                    )}
                    {file.indexing_status === 'failed' && (
                      <p className="text-sm text-red-600 mt-1">
                        {file.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(file.indexing_status)}
                    <button
                      onClick={() => handleDeleteFile(file.file_id)}
                      disabled={isDeleting}
                      className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Delete file"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 