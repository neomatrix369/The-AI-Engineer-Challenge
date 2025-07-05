# 🔍 Vercel Deployment Debugging Guide

This guide helps you debug the "Files not found or not indexed" error in your Vercel deployment.

## 🚨 The Problem

You're getting this error when trying to chat with files:
```
Error: Failed to chat with file: {"detail":"Files not found or not indexed: 1db69162-4e64-4b44-8aa9-a8577ff1a1bf"}
```

## 🔧 Debugging Steps

### Step 1: Check Browser Console

1. Open your Vercel deployment in the browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Upload a file and watch for these messages:

**Expected Success Flow:**
```
🔍 Starting indexing for browser-stored file: test.pdf (1db69162-4e64-4b44-8aa9-a8577ff1a1bf)
📁 File created: test.pdf (45000 bytes)
⚙️ Processing file with FileProcessor...
✅ File processed: 5 chunks, 5 embeddings
📤 Sending pre-indexed data to backend...
✅ Successfully indexed browser-stored file: test.pdf
```

**If you see errors, note them down.**

### Step 2: Check Network Tab

1. In Developer Tools, go to the Network tab
2. Upload a file and look for these requests:

**Required Requests:**
- `POST /api/upload-file` - Should return `use_browser_storage: true`
- `POST /api/pre-indexed-file` - Should return success
- `GET /api/files` - Should include your file
- `GET /api/files/{file_id}/status` - Should show "completed"

### Step 3: Test File Storage

Open browser console and run:
```javascript
// Check if file is stored
debugStorage.logStorageInfo()

// Check specific file
debugStorage.isFileStored('1db69162-4e64-4b44-8aa9-a8577ff1a1bf')
```

### Step 4: Test Backend Health

Check if the backend is in read-only mode:
```bash
curl https://your-vercel-app.vercel.app/api/health
```

Should return: `{"status": "ok", "readonly": true}`

## 🐛 Common Issues and Solutions

### Issue 1: File Not Stored in Browser

**Symptoms:**
- No console messages about indexing
- `debugStorage.logStorageInfo()` shows no files

**Solution:**
1. Check if `use_browser_storage: true` in upload response
2. Verify `file_content` is present in response
3. Check for JavaScript errors in console

### Issue 2: File Processing Fails

**Symptoms:**
- Console shows "Starting indexing" but no "File processed"
- JavaScript errors about FileProcessor

**Solution:**
1. Check if file format is supported (PDF, CSV, JSON, TXT, MD)
2. Verify file size is reasonable (< 10MB)
3. Check for CORS errors in network tab

### Issue 3: Backend Indexing Fails

**Symptoms:**
- Console shows "Sending pre-indexed data" but no success message
- Network tab shows 500 error on `/api/pre-indexed-file`

**Solution:**
1. Check Vercel function logs for backend errors
2. Verify OpenAI API key is configured
3. Check if embeddings are being generated correctly

### Issue 4: Timing Issues

**Symptoms:**
- File uploads successfully but chat fails immediately
- Error shows file not indexed

**Solution:**
1. Wait a few seconds after upload before trying to chat
2. Refresh the page to reload file list
3. Check if indexing completed in console

## 🔍 Advanced Debugging

### Check Backend Logs

In Vercel dashboard:
1. Go to your project
2. Click on "Functions" tab
3. Look for `/api/pre-indexed-file` function logs
4. Check for any error messages

### Test Individual Components

```javascript
// Test file upload
const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
const result = await api.uploadFile(file)
console.log('Upload result:', result)

// Test indexing
await api.indexBrowserStoredFile(result.file_id, result.filename, result.file_content)

// Test file listing
const files = await api.listFiles()
console.log('Files:', files)

// Test chat
const stream = await api.chatWithFile({
  user_message: "What is this file about?",
  file_ids: [result.file_id]
})
```

### Check File Status

```javascript
// Check specific file status
const status = await api.getFileIndexingStatus('1db69162-4e64-4b44-8aa9-a8577ff1a1bf')
console.log('File status:', status)
```

## 📊 Expected Behavior

### Successful Flow:
1. **Upload**: File uploaded, stored in browser, indexing starts
2. **Processing**: File chunked and embeddings generated
3. **Indexing**: Chunks sent to backend, stored in vector database
4. **Chat**: File available for RAG chat

### Console Output:
```
🔍 Starting indexing for browser-stored file: test.pdf (1db69162-4e64-4b44-8aa9-a8577ff1a1bf)
📁 File created: test.pdf (45000 bytes)
⚙️ Processing file with FileProcessor...
✅ File processed: 5 chunks, 5 embeddings
📤 Sending pre-indexed data to backend...
✅ Successfully indexed browser-stored file: test.pdf
```

### Network Requests:
- `POST /api/upload-file` → `{"use_browser_storage": true, "file_content": "..."}`
- `POST /api/pre-indexed-file` → `{"message": "File indexed successfully"}`
- `GET /api/files` → `{"files": [{"file_id": "...", "indexing_status": "completed"}]}`

## 🚀 Quick Fixes

### If indexing fails:
1. Clear browser storage: `debugStorage.clearAllStoredFiles()`
2. Refresh page
3. Upload file again
4. Wait 5-10 seconds before trying to chat

### If chat still fails:
1. Check if file appears in "Chat with File" mode
2. Verify file status shows "Ready" or "Unknown"
3. Try selecting the file again
4. Check console for detailed error messages

## 📞 Getting Help

If you're still having issues:

1. **Collect Debug Info:**
   ```javascript
   // Run these commands and share the output
   debugStorage.logStorageInfo()
   console.log('API URL:', process.env.NEXT_PUBLIC_API_URL)
   ```

2. **Check Network Tab:**
   - Screenshot any failed requests
   - Note the response status codes

3. **Check Console:**
   - Copy any error messages
   - Note the sequence of log messages

4. **Share Details:**
   - File type and size
   - Browser and OS
   - Vercel deployment URL
   - Any error messages from above

This debugging guide should help you identify and fix the indexing issue in your Vercel deployment! 🎉 