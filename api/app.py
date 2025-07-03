# Import required FastAPI components for building the API
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
# Import Pydantic for data validation and settings management
from pydantic import BaseModel
# Import OpenAI client for interacting with OpenAI's API
from openai import OpenAI
import os
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv
import uuid
from pathlib import Path
import json
import asyncio
from datetime import datetime

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
INDEXES_DIR = Path("indexes")
CHAT_HISTORY_DIR = Path("chat_history")

# Check if we're in a read-only environment (like Vercel)
def is_readonly_environment():
    """Check if we're in a read-only environment like Vercel"""
    try:
        # Try to create a test file
        test_file = UPLOADS_DIR / "test_write.txt"
        UPLOADS_DIR.mkdir(exist_ok=True)
        with open(test_file, 'w') as f:
            f.write("test")
        os.remove(test_file)
        return False
    except (OSError, PermissionError):
        return True

# Check if we're in read-only mode
IS_READONLY = is_readonly_environment()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "https://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the data model for chat requests using Pydantic
# This ensures incoming request data is properly validated
class ChatRequest(BaseModel):
    developer_message: str  # Message from the developer/system
    user_message: str      # Message from the user
    model: Optional[str] = "gpt-4.1-mini"  # Optional model selection with default

class PDFChatRequest(BaseModel):
    user_message: str
    pdf_file_ids: List[str]  # Support multiple PDFs
    session_id: Optional[str] = None
    model: Optional[str] = "gpt-4.1-mini"

class ChatSession(BaseModel):
    session_id: str
    created_at: str
    pdf_file_ids: List[str]
    messages: List[Dict[str, Any]]

class PDFUploadResponse(BaseModel):
    filename: str
    file_id: str
    message: str
    indexing_status: str
    use_browser_storage: bool = False
    file_content: Optional[str] = None  # Base64 encoded file content for browser storage

class PDFIndexingStatus(BaseModel):
    file_id: str
    status: str  # "pending", "indexing", "completed", "failed"
    message: str

class ChatHistoryResponse(BaseModel):
    sessions: List[ChatSession]

class PreIndexedPDFRequest(BaseModel):
    file_id: str
    filename: str
    chunks: List[str]
    embeddings: List[List[float]]

# In-memory storage for indexing status (in production, use a proper database)
indexing_status = {}

# In-memory storage for vector databases (in production, use a proper vector store)
vector_databases = {}

# In-memory storage for chat sessions (in production, use a proper database)
chat_sessions: Dict[str, ChatSession] = {}

# In-memory storage for files when in read-only mode
memory_stored_files: Dict[str, bytes] = {}

def save_chat_session(session: ChatSession):
    """Save chat session to file or memory"""
    if IS_READONLY:
        # Store in memory for read-only environments
        chat_sessions[session.session_id] = session
        return
    
    try:
        session_file = CHAT_HISTORY_DIR / f"{session.session_id}.json"
        with open(session_file, 'w') as f:
            json.dump(session.dict(), f, indent=2)
    except Exception as e:
        print(f"Warning: Failed to save chat session: {e}")

def load_chat_session(session_id: str) -> Optional[ChatSession]:
    """Load chat session from file or memory"""
    if IS_READONLY:
        return chat_sessions.get(session_id)
    
    try:
        session_file = CHAT_HISTORY_DIR / f"{session_id}.json"
        if session_file.exists():
            with open(session_file, 'r') as f:
                data = json.load(f)
                return ChatSession(**data)
    except Exception as e:
        print(f"Warning: Failed to load chat session: {e}")
    return None

def get_all_chat_sessions() -> List[ChatSession]:
    """Get all chat sessions from files or memory"""
    if IS_READONLY:
        return list(chat_sessions.values())
    
    sessions = []
    try:
        for session_file in CHAT_HISTORY_DIR.glob("*.json"):
            with open(session_file, 'r') as f:
                data = json.load(f)
                sessions.append(ChatSession(**data))
    except Exception as e:
        print(f"Warning: Failed to load chat sessions: {e}")
    return sessions

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

async def index_pdf(file_content: bytes, file_id: str, filename: str):
    """Index a PDF file using the aimakerspace library"""
    try:
        # Update status to indexing
        indexing_status[file_id] = {
            "status": "indexing",
            "message": "Processing PDF and creating embeddings..."
        }
        
        # Create a temporary file path for processing
        if IS_READONLY:
            # Store in memory
            memory_stored_files[file_id] = file_content
            temp_file_path = f"/tmp/{file_id}_{filename}"
            with open(temp_file_path, 'wb') as f:
                f.write(file_content)
        else:
            # Store on disk
            file_path = UPLOADS_DIR / f"{file_id}_{filename}"
            with open(file_path, "wb") as f:
                f.write(file_content)
            temp_file_path = str(file_path)
        
        # Load PDF text
        pdf_loader = PDFLoader(temp_file_path)
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
        
        # Save the vector database metadata
        index_data = {
            "file_id": file_id,
            "chunks_count": len(chunks),
            "indexed_at": asyncio.get_event_loop().time(),
            "status": "completed"
        }
        
        if not IS_READONLY:
            index_file = INDEXES_DIR / f"{file_id}.json"
            with open(index_file, 'w') as f:
                json.dump(index_data, f)
        
        # Update status to completed
        indexing_status[file_id] = {
            "status": "completed",
            "message": f"Successfully indexed {len(chunks)} text chunks"
        }
        
        # Clean up temp file if in read-only mode
        if IS_READONLY:
            try:
                os.remove(temp_file_path)
            except:
                pass
        
    except Exception as e:
        # Update status to failed
        indexing_status[file_id] = {
            "status": "failed",
            "message": f"Indexing failed: {str(e)}"
        }
        raise

# Define PDF chat endpoint with enhanced RAG functionality
@app.post("/api/chat-pdf")
async def chat_with_pdf(request: PDFChatRequest):
    try:
        # Validate PDF file IDs
        if not request.pdf_file_ids:
            raise HTTPException(status_code=400, detail="At least one PDF file ID is required")
        
        # Check if all PDFs are indexed
        missing_pdfs = []
        for pdf_id in request.pdf_file_ids:
            if pdf_id not in vector_databases:
                missing_pdfs.append(pdf_id)
        
        if missing_pdfs:
            raise HTTPException(
                status_code=400, 
                detail=f"PDFs not found or not indexed: {', '.join(missing_pdfs)}"
            )
        
        # Get or create chat session
        session_id = request.session_id or str(uuid.uuid4())
        if session_id not in chat_sessions:
            chat_sessions[session_id] = ChatSession(
                session_id=session_id,
                created_at=datetime.now().isoformat(),
                pdf_file_ids=request.pdf_file_ids,
                messages=[]
            )
        
        session = chat_sessions[session_id]
        
        # Collect relevant chunks from all PDFs
        all_relevant_chunks = []
        pdf_names = []
        
        for pdf_id in request.pdf_file_ids:
            pdf_data = vector_databases[pdf_id]
            vector_db = pdf_data["vector_db"]
            
            # Search for relevant chunks
            relevant_chunks = vector_db.search_by_text(request.user_message, k=2, return_as_text=True)
            all_relevant_chunks.extend(relevant_chunks)
            
            # Get PDF name for context
            if IS_READONLY:
                # In read-only mode, we don't have file paths, so use the ID
                pdf_names.append(f"PDF_{pdf_id[:8]}")
            else:
                pdf_files = [f for f in UPLOADS_DIR.glob("*.pdf") if f.name.startswith(pdf_id)]
                if pdf_files:
                    pdf_name = "_".join(pdf_files[0].name.split("_")[1:])
                    pdf_names.append(pdf_name)
        
        if not all_relevant_chunks:
            raise HTTPException(
                status_code=400, 
                detail="No relevant content found in the selected PDFs"
            )
        
        # Create context from relevant chunks
        context = "\n\n".join(all_relevant_chunks)
        pdf_list = ", ".join(pdf_names) if pdf_names else "selected PDFs"
        
        # Create the system message with context
        system_message = f"""You are a helpful AI assistant that answers questions based on the provided PDF content.

PDF Sources: {pdf_list}

PDF Context:
{context}

Instructions:
- Answer questions based ONLY on the information provided in the PDF context above
- If the question cannot be answered from the PDF content, say "I cannot answer this question based on the provided PDF content"
- Be accurate and helpful
- Cite specific parts of the PDF when possible
- If multiple PDFs are referenced, specify which PDF contains the information"""

        # Initialize OpenAI client
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured")
        
        client = OpenAI(api_key=api_key)
        
        # Add user message to session
        session.messages.append({
            "role": "user",
            "content": request.user_message,
            "timestamp": datetime.now().isoformat()
        })
        
        # Create an async generator function for streaming responses
        async def generate():
            try:
                # Create a streaming chat completion request
                stream = client.chat.completions.create(
                    model=request.model,
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": request.user_message}
                    ],
                    stream=True  # Enable streaming response
                )
                
                response_content = ""
                
                # Yield each chunk of the response as it becomes available
                for chunk in stream:
                    if chunk.choices[0].delta.content is not None:
                        content = chunk.choices[0].delta.content
                        response_content += content
                        yield content
                
                # Add AI response to session
                session.messages.append({
                    "role": "assistant",
                    "content": response_content,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Save session
                save_chat_session(session)
                
            except Exception as e:
                # Add error message to session
                error_msg = f"Error: {str(e)}"
                session.messages.append({
                    "role": "assistant",
                    "content": error_msg,
                    "timestamp": datetime.now().isoformat()
                })
                save_chat_session(session)
                yield error_msg

        # Return a streaming response to the client
        return StreamingResponse(generate(), media_type="text/plain")
    
    except HTTPException:
        raise
    except Exception as e:
        # Handle any errors that occur during processing
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

# Define endpoint to get chat history
@app.get("/api/chat-history")
async def get_chat_history():
    try:
        sessions = get_all_chat_sessions()
        return ChatHistoryResponse(sessions=sessions)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chat history: {str(e)}")

# Define endpoint to get a specific chat session
@app.get("/api/chat-history/{session_id}")
async def get_chat_session(session_id: str):
    try:
        session = load_chat_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        return session
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get chat session: {str(e)}")

# Define PDF upload endpoint
@app.post("/api/upload-pdf", response_model=PDFUploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Validate file size (10MB limit)
        content = await file.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=400, detail="File size too large. Maximum size is 10MB")
        
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        filename = file.filename
        
        if IS_READONLY:
            # In read-only mode, return the file content for browser storage
            import base64
            file_content_b64 = base64.b64encode(content).decode('utf-8')
            
            return PDFUploadResponse(
                filename=filename,
                file_id=file_id,
                message="PDF uploaded successfully (stored in browser)",
                indexing_status="pending",
                use_browser_storage=True,
                file_content=file_content_b64
            )
        else:
            # Save the file to disk
            file_path = UPLOADS_DIR / f"{file_id}_{filename}"
            with open(file_path, "wb") as buffer:
                buffer.write(content)
            
            # Initialize indexing status
            indexing_status[file_id] = {
                "status": "pending",
                "message": "File uploaded, indexing will start shortly..."
            }
            
            # Start indexing in the background
            asyncio.create_task(index_pdf(content, file_id, filename))
            
            return PDFUploadResponse(
                filename=filename,
                file_id=file_id,
                message="PDF uploaded successfully",
                indexing_status="pending",
                use_browser_storage=False
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
        
        if IS_READONLY:
            # In read-only mode, return files from memory
            for file_id, content in memory_stored_files.items():
                pdf_files.append({
                    "file_id": file_id,
                    "original_filename": f"PDF_{file_id[:8]}.pdf",
                    "uploaded_at": datetime.now().timestamp(),
                    "indexing_status": "unknown",
                    "indexing_message": "File in browser storage"
                })
        else:
            # List files from disk
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
    return {"status": "ok", "readonly": IS_READONLY}

@app.post("/api/pre-indexed-pdf")
async def accept_pre_indexed_pdf(request: PreIndexedPDFRequest):
    """Accept pre-indexed PDF data from the frontend for browser-stored files"""
    try:
        # Create vector database from pre-indexed data
        vector_db = VectorDatabase()
        
        # Convert embeddings to numpy arrays and insert into vector database
        import numpy as np
        for chunk, embedding in zip(request.chunks, request.embeddings):
            vector_db.insert(chunk, np.array(embedding))
        
        # Store the vector database in memory for quick access
        vector_databases[request.file_id] = {
            "vector_db": vector_db,
            "chunks": request.chunks
        }
        
        # Update indexing status
        indexing_status[request.file_id] = {
            "status": "completed",
            "message": f"Successfully indexed {len(request.chunks)} text chunks from browser storage"
        }
        
        return {"message": "PDF indexed successfully", "chunks_count": len(request.chunks)}
        
    except Exception as e:
        # Update status to failed
        indexing_status[request.file_id] = {
            "status": "failed",
            "message": f"Indexing failed: {str(e)}"
        }
        raise HTTPException(status_code=500, detail=f"Failed to index PDF: {str(e)}")

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
