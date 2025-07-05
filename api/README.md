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