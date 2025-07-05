# 🔍 Browser Storage Testing Guide

This guide helps you test and verify that files uploaded via the browser are properly stored in browser storage and can be chunked before being sent to the LLM.

## 🎯 What We're Testing

1. **File Upload to Browser Storage**: Files are stored in `localStorage` with key `file_chat_files`
2. **File Chunking**: Files are processed and chunked client-side using `FileProcessor`
3. **Indexing**: Chunks and embeddings are sent to backend for RAG functionality
4. **Read-Only Environment Support**: Works on Vercel and other read-only environments

## 🛠️ Testing Tools

We've created debug utilities in `frontend/src/utils/debugUtils.ts` that provide console commands for easy testing.

### Available Console Commands

```javascript
// Show detailed storage information
debugStorage.logStorageInfo()

// Get all stored files with details
debugStorage.getAllStoredFiles()

// Get storage statistics
debugStorage.getStorageStats()

// Check if a specific file is stored
debugStorage.isFileStored('file_id_here')

// Clear all stored files (for testing)
debugStorage.clearAllStoredFiles()
```

## 📋 Step-by-Step Testing Process

### 1. Environment Setup

First, ensure you're testing in a read-only environment (like Vercel):

```bash
# Check if you're in read-only mode
curl http://localhost:8000/api/health
# Should return: {"status": "ok", "readonly": true}
```

### 2. Upload a Test File

1. Go to your app's upload page
2. Upload a PDF, CSV, JSON, or text file
3. Watch the browser console for debug messages

### 3. Verify Browser Storage

Open browser console and run:

```javascript
// Check if file was stored
debugStorage.logStorageInfo()

// Expected output:
// 🔍 Browser Storage Debug Info
// Storage Available: true
// Storage Key: file_chat_files
// Total Files: 1
// Total Size (KB): 45
// Stored Files:
//   - abc123: test.pdf (45KB)
```

### 4. Check File Processing

Look for these console messages during upload:

```
✅ File uploaded successfully
✅ File stored in browser storage
✅ Starting client-side indexing...
✅ File processed and chunked
✅ Chunks and embeddings sent to backend
✅ Successfully indexed browser-stored file: test.pdf
```

### 5. Test Chat Functionality

1. Go to "Chat with File" mode
2. Select your uploaded file
3. Ask a question about the file content
4. Verify the response uses the file content

## 🔍 Detailed Verification Steps

### Step 1: Verify Storage Location

```javascript
// Check localStorage directly
localStorage.getItem('file_chat_files')
// Should return a JSON string with file data
```

### Step 2: Verify File Content

```javascript
// Get stored files
const files = debugStorage.getAllStoredFiles()
console.log('Stored files:', files)

// Check specific file
const fileId = Object.keys(files)[0]
const fileData = files[fileId]
console.log('File details:', fileData)
```

### Step 3: Verify Chunking Process

The chunking happens in `indexBrowserStoredFile()`:

1. **Base64 to File**: Converts stored base64 content back to File object
2. **File Processing**: Uses `FileProcessor.processFile()` to extract text and create chunks
3. **Embedding Generation**: Creates embeddings for each chunk
4. **Backend Submission**: Sends chunks and embeddings to `/api/pre-indexed-file`

### Step 4: Verify Backend Integration

Check the network tab for these requests:

1. `POST /api/upload-file` - Initial upload
2. `POST /api/pre-indexed-file` - Chunks and embeddings submission
3. `GET /api/files` - File listing (includes browser-stored files)
4. `POST /api/chat-file` - RAG chat with indexed files

## 🐛 Common Issues and Solutions

### Issue 1: "Unknown" Status in File List

**Problem**: Files show "Unknown" status instead of "Ready"

**Solution**: This is expected for browser-stored files. The Chat component now includes "unknown" status files as ready for chat.

### Issue 2: "No indexed files available"

**Problem**: Chat shows no files available even after upload

**Solution**: 
1. Check if file was stored: `debugStorage.logStorageInfo()`
2. Verify indexing completed: Look for "Successfully indexed" console message
3. Refresh the page to reload file list

### Issue 3: File not found in storage

**Problem**: File uploads but doesn't appear in browser storage

**Solution**:
1. Check if `use_browser_storage: true` in upload response
2. Verify `file_content` is present in response
3. Check for console errors in `addBrowserStoredFile()`

### Issue 4: Chunking fails

**Problem**: File uploads but chunking doesn't work

**Solution**:
1. Check browser console for FileProcessor errors
2. Verify file format is supported (PDF, CSV, JSON, TXT, MD)
3. Check if file size is reasonable (< 10MB)

## 📊 Performance Testing

### Test File Size Limits

```javascript
// Test with different file sizes
const testFiles = [
  { name: 'small.txt', size: '1KB' },
  { name: 'medium.pdf', size: '500KB' },
  { name: 'large.csv', size: '2MB' }
]

// Monitor performance
console.time('upload')
await debugStorage.testFileUpload(file)
console.timeEnd('upload')
```

### Test Multiple Files

```javascript
// Upload multiple files and check storage
const files = [file1, file2, file3]
for (const file of files) {
  const result = await debugStorage.testFileUpload(file)
  console.log(`File ${file.name}: ${result.storedInBrowser ? '✅ Stored' : '❌ Failed'}`)
}

// Check total storage usage
debugStorage.getStorageStats()
```

## 🔧 Manual Testing Checklist

- [ ] Upload PDF file → Verify stored in browser
- [ ] Upload CSV file → Verify stored in browser  
- [ ] Upload JSON file → Verify stored in browser
- [ ] Upload text file → Verify stored in browser
- [ ] Check file list shows uploaded files
- [ ] Select files in Chat mode → Verify available
- [ ] Ask questions about file content → Verify RAG responses
- [ ] Delete files → Verify removed from storage
- [ ] Refresh page → Verify files persist
- [ ] Test in incognito mode → Verify works without server

## 🚀 Production Testing on Vercel

1. Deploy to Vercel
2. Upload test files
3. Use browser console to verify storage
4. Test chat functionality
5. Verify files persist across sessions

## 📝 Debug Commands Reference

```javascript
// Quick status check
debugStorage.logStorageInfo()

// Detailed file inspection
const files = debugStorage.getAllStoredFiles()
Object.entries(files).forEach(([id, data]) => {
  console.log(`${id}: ${data.filename} (${data.fileSizeKB}KB)`)
})

// Test upload
const file = document.querySelector('input[type="file"]').files[0]
const result = await debugStorage.testFileUpload(file)
console.log('Upload result:', result)

// Clear for testing
debugStorage.clearAllStoredFiles()
```

This testing guide ensures your browser storage functionality works correctly in read-only environments like Vercel! 🎉 