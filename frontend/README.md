# Frontend - Multi-Format RAG Chat Application

A modern Next.js frontend for a RAG (Retrieval-Augmented Generation) chat application that supports multiple file formats including PDF, Markdown, Text, and CSV files.

## Features

- **Multi-Format File Upload**: Support for PDF, Markdown (.md), Text (.txt), CSV, and JSON files
- **Real-time Chat Interface**: Stream responses with typing indicators
- **File Management**: Upload, view, and select files for chat
- **Chat History**: Persistent sessions with file context
- **Responsive Design**: Modern UI built with Tailwind CSS
- **Browser Storage**: Client-side processing for read-only environments

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **PDF.js** for client-side PDF processing
- **Browser localStorage** for file storage

## File Format Support

- **PDF**: Client-side text extraction using PDF.js
- **Markdown (.md)**: Direct text processing
- **Text (.txt)**: Simple text file processing
- **CSV**: Structured data processing with column headers
- **JSON**: Structured data processing with hierarchical object flattening

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Architecture

The frontend uses a hybrid approach:
- **Server-side rendering** for initial load
- **Client-side processing** for file handling
- **Real-time streaming** for chat responses
- **Browser storage** for read-only environments