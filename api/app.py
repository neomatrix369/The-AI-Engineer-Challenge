# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
from typing import Optional, List
from dotenv import load_dotenv
import uuid
from pathlib import Path
import json
import asyncio

# Import aimakerspace components for PDF processing and indexing
from aimakerspace.text_utils import PDFLoader, CharacterTextSplitter
from aimakerspace.vectordatabase import VectorDatabase

load_dotenv()

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API")

# Get the frontend URL from environment or use a default
FRONTEND_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3000")

# Create uploads directory if it doesn't exist
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

# Create indexes directory for storing vector databases
INDEXES_DIR = Path("indexes")
INDEXES_DIR.mkdir(exist_ok=True)

# Configure CORS (Cross-Origin Resource Sharing) middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for now
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],
    expose_headers=["*"]
)

# Define the data model for chat requests using Pydantic
# This ensures incoming request data is properly validated
class ChatRequest(BaseModel):
    developer_message: str  # Message from the developer/system
    user_message: str      # Message from the user
    model: Optional[str] = "gpt-4.1-mini"  # Optional model selection with default

class PDFChatRequest(BaseModel):
    user_message: str
    pdf_file_id: str
    model: Optional[str] = "gpt-4.1-mini"

class PDFUploadResponse(BaseModel):
    filename: str
    file_id: str
    message: str
    indexing_status: str

class PDFIndexingStatus(BaseModel):
    file_id: str
    status: str  # "pending", "indexing", "completed", "failed"
    message: str

# In-memory storage for indexing status (in production, use a proper database)
indexing_status = {}

# In-memory storage for vector databases (in production, use a proper vector store)
vector_databases = {}

# Define the main chat endpoint that handles POST requests
@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        # Initialize OpenAI client with the provided API key
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key and (len(api_key) > 0):
            print('INFO: OPENAI_API_KEY has been set')
        else:
            print('WARNING: OPENAI_API_KEY has NOT set, please check Environment variables settings.')

        client = OpenAI(api_key=api_key)
        
        # Create an async generator function for streaming responses
        async def generate():
            # Create a streaming chat completion request
            stream = client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "developer", "content": request.developer_message},
                    {"role": "user", "content": request.user_message}
                ],
                stream=True  # Enable streaming response
            )
            
            # Yield each chunk of the response as it becomes available
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")
    
    except Exception as e:
        # Handle any errors that occur during processing
        raise HTTPException(status_code=500, detail=str(e))

async def index_pdf(file_path: Path, file_id: str):
    """Index a PDF file using the aimakerspace library"""
    try:
        # Update status to indexing
        indexing_status[file_id] = {
            "status": "indexing",
            "message": "Processing PDF and creating embeddings..."
        }
        
        # Load PDF text
        pdf_loader = PDFLoader(str(file_path))
        documents = pdf_loader.load_documents()
        
        if not documents:
            raise ValueError("No text could be extracted from the PDF")
        
        # Split text into chunks
        splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunks = splitter.split_texts(documents)
        
        # Update status
        indexing_status[file_id] = {
            "status": "indexing", 
            "message": f"Creating embeddings for {len(chunks)} text chunks..."
        }
        
        # Create vector database
        vector_db = VectorDatabase()
        await vector_db.abuild_from_list(chunks)
        
        # Store the vector database in memory for quick access
        vector_databases[file_id] = {
            "vector_db": vector_db,
            "chunks": chunks
        }
        
        # Save the vector database (in a real app, you'd use a proper vector store)
        # For now, we'll store metadata about the indexing
        index_data = {
            "file_id": file_id,
            "chunks_count": len(chunks),
            "indexed_at": asyncio.get_event_loop().time(),
            "status": "completed"
        }
        
        index_file = INDEXES_DIR / f"{file_id}.json"
        with open(index_file, 'w') as f:
            json.dump(index_data, f)
        
        # Update status to completed
        indexing_status[file_id] = {
            "status": "completed",
            "message": f"Successfully indexed {len(chunks)} text chunks"
        }
        
    except Exception as e:
        # Update status to failed
        indexing_status[file_id] = {
            "status": "failed",
            "message": f"Indexing failed: {str(e)}"
        }
        raise

# Define PDF chat endpoint with RAG functionality
@app.post("/api/chat-pdf")
async def chat_with_pdf(request: PDFChatRequest):
    try:
        # Check if the PDF is indexed
        if request.pdf_file_id not in vector_databases:
            raise HTTPException(status_code=400, detail="PDF not found or not indexed")
        
        # Get the vector database and chunks for this PDF
        pdf_data = vector_databases[request.pdf_file_id]
        vector_db = pdf_data["vector_db"]
        chunks = pdf_data["chunks"]
        
        # Search for relevant chunks
        relevant_chunks = vector_db.search_by_text(request.user_message, k=3, return_as_text=True)
        
        if not relevant_chunks:
            raise HTTPException(status_code=400, detail="No relevant content found in PDF")
        
        # Create context from relevant chunks
        context = "\n\n".join(relevant_chunks)
        
        # Create the system message with context
        system_message = f"""You are a helpful AI assistant that answers questions based on the provided PDF content.

PDF Context:
{context}

Instructions:
- Answer questions based ONLY on the information provided in the PDF context above
- If the question cannot be answered from the PDF content, say "I cannot answer this question based on the provided PDF content"
- Be accurate and helpful
- Cite specific parts of the PDF when possible"""

        # Initialize OpenAI client
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        client = OpenAI(api_key=api_key)
        
        # Create an async generator function for streaming responses
        async def generate():
            # Create a streaming chat completion request
            stream = client.chat.completions.create(
                model=request.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": request.user_message}
                ],
                stream=True  # Enable streaming response
            )
            
            # Yield each chunk of the response as it becomes available
            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")
    
    except HTTPException:
        raise
    except Exception as e:
        # Handle any errors that occur during processing
        raise HTTPException(status_code=500, detail=str(e))

# Define PDF upload endpoint
@app.post("/api/upload-pdf", response_model=PDFUploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        filename = f"{file_id}_{file.filename}"
        file_path = UPLOADS_DIR / filename
        
        # Save the file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Initialize indexing status
        indexing_status[file_id] = {
            "status": "pending",
            "message": "File uploaded, indexing will start shortly..."
        }
        
        # Start indexing in the background
        asyncio.create_task(index_pdf(file_path, file_id))
        
        return PDFUploadResponse(
            filename=file.filename,
            file_id=file_id,
            message="PDF uploaded successfully",
            indexing_status="pending"
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")

# Define endpoint to list uploaded PDFs
@app.get("/api/pdfs")
async def list_pdfs():
    try:
        pdf_files = []
        for file_path in UPLOADS_DIR.glob("*.pdf"):
            # Extract original filename from stored filename (remove UUID prefix)
            stored_name = file_path.name
            original_name = "_".join(stored_name.split("_")[1:])  # Remove UUID prefix
            file_id = stored_name.split("_")[0]
            
            # Get indexing status
            status_info = indexing_status.get(file_id, {
                "status": "unknown",
                "message": "Status unknown"
            })
            
            pdf_files.append({
                "file_id": file_id,
                "original_filename": original_name,
                "uploaded_at": file_path.stat().st_mtime,
                "indexing_status": status_info["status"],
                "indexing_message": status_info["message"]
            })
        
        return {"pdfs": pdf_files}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list PDFs: {str(e)}")

# Define endpoint to get indexing status for a specific PDF
@app.get("/api/pdfs/{file_id}/status")
async def get_pdf_indexing_status(file_id: str):
    try:
        status_info = indexing_status.get(file_id, {
            "status": "unknown",
            "message": "PDF not found"
        })
        
        return PDFIndexingStatus(
            file_id=file_id,
            status=status_info["status"],
            message=status_info["message"]
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get indexing status: {str(e)}")

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
