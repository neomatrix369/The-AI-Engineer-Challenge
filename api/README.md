# 🚀 AI Makerspace Backend - Now with Supercharged Logging! 

Hey there, fellow AI enthusiast! 👋 We've just upgraded our backend with some seriously cool logging capabilities. No more mysterious "it works on my machine" moments - now we can track everything that's happening in real-time! 

## 🎯 What's New?

We've replaced all those boring `print()` statements with a proper logging system that:

- 📝 **Saves logs to files** - So you can investigate issues later
- 🖥️ **Shows logs in console** - Real-time monitoring for the win!
- 🏷️ **Different log levels** - From "just FYI" to "OMG something's broken!"
- ⚡ **Performance tracking** - See exactly how long operations take
- 🐛 **Full error details** - Stack traces and everything you need to debug

## 🎮 How to Use

### Basic Logging

```python
from app import get_logger

# Get your logger
logger = get_logger("my_awesome_module")

# Log some stuff
logger.info("Processing that super important file...")
logger.warning("This file is getting pretty big...")
logger.error("Oops, something went wrong!", exc_info=True)
```

### Performance Tracking

```python
import time

start_time = time.time()
# ... do something cool ...
elapsed = time.time() - start_time
logger.info("That operation took %.2f seconds - not bad!", elapsed)
```

## 🔧 Environment Variables

Want to control how much logging you see? Just set these environment variables:

```bash
# See everything (debug mode)
export LOG_LEVEL=DEBUG

# Just the important stuff (default)
export LOG_LEVEL=INFO

# Only warnings and errors
export LOG_LEVEL=WARNING
```

## 📁 Where Are My Logs?

Log files are created in the `logs/` directory with timestamps:

```
logs/ai_makerspace_20241201_143022.log
```

Each log file contains detailed information about what happened, when it happened, and where it happened.

## 🧪 Testing the Logging

Want to see the logging in action? Run our test script:

```bash
cd api
python test_logging.py
```

This will create a test log file and show you what the logging looks like!

## 🌐 Vercel Deployment

When deployed on Vercel, you can see logs in several ways:

1. **Vercel Dashboard** - Go to your project → Functions tab → Real-time logs
2. **Vercel CLI** - Run `vercel logs --follow` for live streaming
3. **File Logs** - Log files are created in `/tmp` on Vercel

## 🔍 What Gets Logged?

### File Processing
- 📤 File uploads and their progress
- 📄 Text extraction from PDFs, CSVs, etc.
- ✂️ Chunk creation and optimization
- 🤖 Embedding generation batches
- 💾 Vector database operations

### API Endpoints
- 🏥 Health check requests
- 📁 File upload processing
- 💬 Chat request handling
- ❌ Error responses and debugging info

### Environment Stuff
- 🌍 Vercel vs local environment detection
- 🔗 Qdrant connection status
- 💾 Browser storage mode detection

## 🛠️ Troubleshooting

### No Log Files?
- Check if the `logs/` directory exists
- Make sure you have write permissions
- On Vercel, logs go to `/tmp` instead

### Missing Log Messages?
- Check your `LOG_LEVEL` environment variable
- Make sure the logger is properly initialized
- Look for any exceptions in the logging setup

### Performance Issues?
- Consider using `LOG_LEVEL=WARNING` in production
- Use structured logging for better performance
- Keep an eye on log file sizes

## 🎉 Migration Complete!

We've successfully replaced all `print()` statements with proper logging:

- `print("Info message")` → `logger.info("Info message")`
- `print(f"Error: {error}")` → `logger.error("Error: %s", str(error))`
- `print("Warning")` → `logger.warning("Warning")`

## 📊 Example Log Output

Here's what you'll see in your logs:

```
2024-12-01 14:30:22,123 - INFO - Logger 'api' initialized with level INFO
2024-12-01 14:30:22,124 - INFO - Log file: logs/api_20241201_143022.log
2024-12-01 14:30:22,125 - INFO - Environment: Vercel
2024-12-01 14:30:23,456 - INFO - 🔍 Processing pre-indexed file: abc123 (document.pdf)
2024-12-01 14:30:23,457 - INFO - 📊 Received 25 chunks
2024-12-01 14:30:24,789 - INFO - ✅ Created 25 embeddings in 1.33 seconds
2024-12-01 14:30:25,123 - INFO - ✅ Vector database operations completed in 0.33 seconds
2024-12-01 14:30:25,124 - INFO - ✅ Successfully indexed file abc123 with 25 chunks in 1.67 seconds
```

## 🎯 Best Practices

1. **Use the right log level** - Don't cry wolf with ERROR for warnings
2. **Include context** - Log relevant data for debugging
3. **Track performance** - Log timing for slow operations
4. **Use structured logging** - Format strings are your friend
5. **Always log exceptions** - Include stack traces with `exc_info=True`

---

That's it! Your backend now has super-powered logging that will help you track down issues and monitor performance like a pro! ��

Happy coding! 🎉

# Backend API - Multi-Format RAG Chat Application

A FastAPI backend for a RAG (Retrieval-Augmented Generation) chat application that supports multiple file formats including PDF, Markdown, Text, and CSV files.

## Features

- **Multi-Format Processing**: Support for PDF, Markdown (.md), Text (.txt), CSV, and JSON files
- **Advanced RAG**: Enhanced retrieval with chat history and multi-file support
- **Vector Database**: Semantic search and indexing
- **Real-time Streaming**: Stream chat responses
- **Session Management**: Persistent chat sessions with file context
- **Custom AI Library**: Integration with aimakerspace library

## Tech Stack

- **FastAPI** with async support
- **OpenAI API** for embeddings and chat
- **Custom aimakerspace library** for AI utilities
- **Vector database** for semantic search
- **Multi-format processing** (PDF, MD, TXT, CSV, JSON)

## API Endpoints

- `POST /api/upload-file` - Upload and index files
- `POST /api/chat-file` - Chat with indexed files
- `POST /api/chat` - General chat without file context
- `GET /api/files` - List uploaded files
- `GET /api/files/{file_id}/status` - Get file indexing status
- `GET /api/chat-history` - Get chat history
- `POST /api/pre-indexed-file` - Accept pre-indexed file data

## File Format Support

- **PDF**: Text extraction and semantic indexing
- **Markdown (.md)**: Direct text processing with formatting preserved
- **Text (.txt)**: Simple text file processing
- **CSV**: Structured data processing with column headers
- **JSON**: Structured data processing with hierarchical object flattening

## Development

```bash
pip install -r requirements.txt
PYTHONPATH=. uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key
- `PYTHONPATH=.` - Required for aimakerspace library imports

## Architecture

The backend uses:
- **Async processing** for file indexing
- **Vector database** for semantic search
- **Session management** for chat history
- **Multi-format support** for various file types

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- An OpenAI API key

## Setup

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows, use: venv\Scripts\activate
```

2. Install the required dependencies:
```bash
pip install fastapi uvicorn openai pydantic
```

## Running the Server

1. Make sure you're in the `api` directory:
```bash
cd api
```

2. Start the server:
```bash
python app.py
```

The server will start on `http://localhost:8000`

## API Documentation

Once the server is running, you can access the interactive API documentation at:
- Swagger UI: `