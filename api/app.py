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

# File type detection and validation
SUPPORTED_EXTENSIONS = {'.pdf', '.md', '.txt', '.csv', '.json'}

def get_file_type(filename: str) -> str:
    """Detect file type based on extension"""
    ext = filename.lower().split('.')[-1]
    if ext == 'pdf':
        return 'pdf'
    elif ext in ['md', 'txt']:
        return 'text'
    elif ext == 'csv':
        return 'csv'
    elif ext == 'json':
        return 'json'
    return 'unknown'

def is_supported_file(filename: str) -> bool:
    """Check if file type is supported"""
    ext = '.' + filename.lower().split('.')[-1]
    return ext in SUPPORTED_EXTENSIONS

def extract_text_content(file_content: bytes) -> List[str]:
    """Extract text content from markdown or text files"""
    try:
        text = file_content.decode('utf-8')
        # For markdown files, we can keep the structure for better chunking
        return [text]
    except UnicodeDecodeError:
        # Try with different encoding if UTF-8 fails
        try:
            text = file_content.decode('latin-1')
            return [text]
        except:
            raise ValueError("Could not decode file content")

def extract_csv_content(file_content: bytes) -> List[str]:
    """Extract text content from CSV files"""
    try:
        import csv
        from io import StringIO
        
        # Decode the content
        text = file_content.decode('utf-8')
        csv_file = StringIO(text)
        
        # Parse CSV and convert to text chunks
        reader = csv.reader(csv_file)
        rows = list(reader)
        
        if not rows:
            raise ValueError("CSV file is empty")
        
        # Convert CSV to structured text
        text_chunks = []
        for i, row in enumerate(rows):
            if i == 0:  # Header row
                header = " | ".join(row)
                text_chunks.append(f"Headers: {header}")
            else:  # Data row
                row_text = " | ".join(str(cell) for cell in row)
                text_chunks.append(f"Row {i}: {row_text}")
        
        return text_chunks
    except UnicodeDecodeError:
        # Try with different encoding if UTF-8 fails
        try:
            text = file_content.decode('latin-1')
            csv_file = StringIO(text)
            reader = csv.reader(csv_file)
            rows = list(reader)
            
            if not rows:
                raise ValueError("CSV file is empty")
            
            text_chunks = []
            for i, row in enumerate(rows):
                if i == 0:
                    header = " | ".join(row)
                    text_chunks.append(f"Headers: {header}")
                else:
                    row_text = " | ".join(str(cell) for cell in row)
                    text_chunks.append(f"Row {i}: {row_text}")
            
            return text_chunks
        except:
            raise ValueError("Could not decode CSV file content")

def extract_json_content(file_content: bytes) -> List[str]:
    """Extract text content from JSON files"""
    try:
        import json
        data = json.loads(file_content.decode('utf-8'))
        
        # Convert JSON to readable text chunks
        text_chunks = []
        
        def flatten_json(obj, path=""):
            if isinstance(obj, dict):
                for key, value in obj.items():
                    new_path = f"{path}.{key}" if path else key
                    flatten_json(value, new_path)
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    new_path = f"{path}[{i}]"
                    flatten_json(item, new_path)
            else:
                text_chunks.append(f"{path}: {obj}")
        
        flatten_json(data)
        return text_chunks
    except UnicodeDecodeError:
        # Try with different encoding if UTF-8 fails
        try:
            data = json.loads(file_content.decode('latin-1'))
            text_chunks = []
            
            def flatten_json(obj, path=""):
                if isinstance(obj, dict):
                    for key, value in obj.items():
                        new_path = f"{path}.{key}" if path else key
                        flatten_json(value, new_path)
                elif isinstance(obj, list):
                    for i, item in enumerate(obj):
                        new_path = f"{path}[{i}]"
                        flatten_json(item, new_path)
                else:
                    text_chunks.append(f"{path}: {obj}")
            
            flatten_json(data)
            return text_chunks
        except:
            raise ValueError("Could not decode JSON file content")
    except Exception as e:
        raise ValueError(f"Could not parse JSON: {str(e)}")

# Define the data model for chat requests using Pydantic
# This ensures incoming request data is properly validated
class ChatRequest(BaseModel):
    developer_message: str  # Message from the developer/system
    user_message: str      # Message from the user
    model: Optional[str] = "gpt-4.1-mini"  # Optional model selection with default

class FileChatRequest(BaseModel):
    user_message: str
    file_ids: List[str]  # Support multiple files
    session_id: Optional[str] = None
    model: Optional[str] = "gpt-4.1-mini"

class ChatSession(BaseModel):
    session_id: str
    created_at: str
    file_ids: List[str]
    messages: List[Dict[str, Any]]

class FileUploadResponse(BaseModel):
    filename: str
    file_id: str
    message: str
    indexing_status: str
    use_browser_storage: bool = False
    file_content: Optional[str] = None  # Base64 encoded file content for browser storage

class FileIndexingStatus(BaseModel):
    file_id: str
    status: str  # "pending", "indexing", "completed", "failed"
    message: str

class ChatHistoryResponse(BaseModel):
    sessions: List[ChatSession]

class PreIndexedFileRequest(BaseModel):
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

async def index_file(file_content: bytes, file_id: str, filename: str):
    """Index a file using the aimakerspace library"""
    try:
        # Update status to indexing
        indexing_status[file_id] = {
            "status": "indexing",
            "message": "Processing file and creating embeddings..."
        }
        
        file_type = get_file_type(filename)
        
        if file_type == 'pdf':
            # Handle PDF files
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
            
        elif file_type == 'text':
            # Handle markdown and text files
            documents = extract_text_content(file_content)
            
            if not documents:
                raise ValueError("No text could be extracted from the file")
            
            # Split text into chunks
            splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = splitter.split_texts(documents)
            
        elif file_type == 'csv':
            # Handle CSV files
            documents = extract_csv_content(file_content)
            
            if not documents:
                raise ValueError("No text could be extracted from the file")
            
            # Split text into chunks
            splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = splitter.split_texts(documents)
            
        elif file_type == 'json':
            # Handle JSON files
            documents = extract_json_content(file_content)
            
            if not documents:
                raise ValueError("No text could be extracted from the file")
            
            # Split text into chunks
            splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = splitter.split_texts(documents)
            
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
        
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
            index_file_path = INDEXES_DIR / f"{file_id}.json"
            with open(index_file_path, 'w') as f:
                json.dump(index_data, f)
        
        # Update status to completed
        indexing_status[file_id] = {
            "status": "completed",
            "message": f"Successfully indexed {len(chunks)} text chunks"
        }
        
        # Clean up temp file if in read-only mode
        if IS_READONLY and file_type == 'pdf':
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
@app.post("/api/chat-file")
async def chat_with_file(request: FileChatRequest):
    try:
        # Validate file IDs
        if not request.file_ids:
            raise HTTPException(status_code=400, detail="At least one file ID is required")
        
        print(f"🔍 Chat request for files: {request.file_ids}")
        print(f"📊 Available vector databases: {list(vector_databases.keys())}")
        print(f"📊 Available indexing status: {list(indexing_status.keys())}")
        
        # Check if all files are indexed
        missing_files = []
        failed_files = []
        for file_id in request.file_ids:
            if file_id not in vector_databases:
                # Check if file has failed indexing
                status_info = indexing_status.get(file_id, {"status": "unknown", "message": "File not found"})
                if status_info["status"] == "failed":
                    failed_files.append(f"{file_id} (failed: {status_info['message']})")
                else:
                    missing_files.append(f"{file_id} (status: {status_info['status']})")
        
        if missing_files or failed_files:
            error_details = []
            if missing_files:
                error_details.append(f"Missing/not indexed: {', '.join(missing_files)}")
            if failed_files:
                error_details.append(f"Failed indexing: {', '.join(failed_files)}")
            
            raise HTTPException(
                status_code=400, 
                detail=f"Files not found or not indexed: {'; '.join(error_details)}"
            )
        
        # Get or create chat session
        session_id = request.session_id or str(uuid.uuid4())
        if session_id not in chat_sessions:
            chat_sessions[session_id] = ChatSession(
                session_id=session_id,
                created_at=datetime.now().isoformat(),
                file_ids=request.file_ids,
                messages=[]
            )
        
        session = chat_sessions[session_id]
        
        # Collect relevant chunks from all files
        all_relevant_chunks = []
        file_names = []
        
        for file_id in request.file_ids:
            file_data = vector_databases[file_id]
            vector_db = file_data["vector_db"]
            
            # Search for relevant chunks
            relevant_chunks = vector_db.search_by_text(request.user_message, k=2, return_as_text=True)
            all_relevant_chunks.extend(relevant_chunks)
            
            # Get file name for context
            if IS_READONLY:
                # In read-only mode, we don't have file paths, so use the ID
                file_names.append(f"File_{file_id[:8]}")
            else:
                # Find the file by ID
                found_file = None
                for extension in SUPPORTED_EXTENSIONS:
                    files = [f for f in UPLOADS_DIR.glob(f"*{extension}") if f.name.startswith(file_id)]
                    if files:
                        found_file = files[0]
                        break
                
                if found_file:
                    file_name = "_".join(found_file.name.split("_")[1:])
                    file_names.append(file_name)
                else:
                    file_names.append(f"File_{file_id[:8]}")
        
        if not all_relevant_chunks:
            raise HTTPException(
                status_code=400, 
                detail="No relevant content found in the selected files"
            )
        
        # Create context from relevant chunks
        context = "\n\n".join(all_relevant_chunks)
        file_list = ", ".join(file_names) if file_names else "selected files"
        
        # Create the system message with context
        system_message = f"""You are a helpful AI assistant that answers questions based on the provided file content.

File Sources: {file_list}

File Context:
{context}

Instructions:
- Answer questions based ONLY on the information provided in the file context above
- If the question cannot be answered from the file content, say "I cannot answer this question based on the provided file content"
- Be accurate and helpful
- Cite specific parts of the files when possible
- If multiple files are referenced, specify which file contains the information"""

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

# Define file upload endpoint
@app.post("/api/upload-file", response_model=FileUploadResponse)
async def upload_file(file: UploadFile = File(...)):
    try:
        # Validate file type
        if not is_supported_file(file.filename):
            supported_extensions = ', '.join(SUPPORTED_EXTENSIONS)
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type. Supported types: {supported_extensions}"
            )
        
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
            
            return FileUploadResponse(
                filename=filename,
                file_id=file_id,
                message=f"{get_file_type(filename).upper()} uploaded successfully (stored in browser)",
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
            asyncio.create_task(index_file(content, file_id, filename))
            
            return FileUploadResponse(
                filename=filename,
                file_id=file_id,
                message=f"{get_file_type(filename).upper()} uploaded successfully",
                indexing_status="pending",
                use_browser_storage=False
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

# Define endpoint to list uploaded files
@app.get("/api/files")
async def list_files():
    try:
        files = []
        
        if IS_READONLY:
            # In read-only mode, return files from memory
            for file_id, content in memory_stored_files.items():
                files.append({
                    "file_id": file_id,
                    "original_filename": f"File_{file_id[:8]}.pdf",  # Fallback name
                    "uploaded_at": datetime.now().timestamp(),
                    "indexing_status": "unknown",
                    "indexing_message": "File in browser storage"
                })
        else:
            # List files from disk - support multiple extensions
            for extension in SUPPORTED_EXTENSIONS:
                for file_path in UPLOADS_DIR.glob(f"*{extension}"):
                    # Extract original filename from stored filename (remove UUID prefix)
                    stored_name = file_path.name
                    original_name = "_".join(stored_name.split("_")[1:])  # Remove UUID prefix
                    file_id = stored_name.split("_")[0]
                    
                    # Get indexing status
                    status_info = indexing_status.get(file_id, {
                        "status": "unknown",
                        "message": "Status unknown"
                    })
                    
                    files.append({
                        "file_id": file_id,
                        "original_filename": original_name,
                        "uploaded_at": file_path.stat().st_mtime,
                        "indexing_status": status_info["status"],
                        "indexing_message": status_info["message"]
                    })
        
        return {"files": files}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")

# Define endpoint to get indexing status for a specific file
@app.get("/api/files/{file_id}/status")
async def get_file_indexing_status(file_id: str):
    try:
        status_info = indexing_status.get(file_id, {
            "status": "unknown",
            "message": "File not found"
        })
        
        return FileIndexingStatus(
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

@app.post("/api/pre-indexed-file")
async def accept_pre_indexed_file(request: PreIndexedFileRequest):
    """Accept pre-indexed file data from the frontend for browser-stored files"""
    try:
        print(f"🔍 Processing pre-indexed file: {request.file_id} ({request.filename})")
        print(f"📊 Received {len(request.chunks)} chunks and {len(request.embeddings)} embeddings")
        
        # Validate input
        if not request.chunks or not request.embeddings:
            raise ValueError("No chunks or embeddings provided")
        
        if len(request.chunks) != len(request.embeddings):
            raise ValueError(f"Mismatch: {len(request.chunks)} chunks vs {len(request.embeddings)} embeddings")
        
        # Create vector database from pre-indexed data
        vector_db = VectorDatabase()
        
        # Convert embeddings to numpy arrays and insert into vector database
        import numpy as np
        for i, (chunk, embedding) in enumerate(zip(request.chunks, request.embeddings)):
            try:
                vector_db.insert(chunk, np.array(embedding))
                print(f"✅ Inserted chunk {i+1}/{len(request.chunks)}")
            except Exception as e:
                print(f"❌ Error inserting chunk {i+1}: {str(e)}")
                raise
        
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
        
        print(f"✅ Successfully indexed file {request.file_id} with {len(request.chunks)} chunks")
        return {"message": "File indexed successfully", "chunks_count": len(request.chunks)}
        
    except Exception as e:
        print(f"❌ Error indexing file {request.file_id}: {str(e)}")
        # Update status to failed
        indexing_status[request.file_id] = {
            "status": "failed",
            "message": f"Indexing failed: {str(e)}"
        }
        raise HTTPException(status_code=500, detail=f"Failed to index file: {str(e)}")

# Define file deletion endpoint
@app.delete("/api/files/{file_id}")
async def delete_file(file_id: str):
    """Delete a file from memory and vector database"""
    try:
        deleted = False
        
        # Remove from vector database
        if file_id in vector_databases:
            del vector_databases[file_id]
            deleted = True
        
        # Remove from indexing status
        if file_id in indexing_status:
            del indexing_status[file_id]
            deleted = True
        
        # Remove from memory stored files (read-only mode)
        if file_id in memory_stored_files:
            del memory_stored_files[file_id]
            deleted = True
        
        # Remove from disk (non-read-only mode)
        if not IS_READONLY:
            # Find and delete the file from disk
            for extension in SUPPORTED_EXTENSIONS:
                file_path = UPLOADS_DIR / f"{file_id}_*{extension}"
                for matching_file in UPLOADS_DIR.glob(f"{file_id}_*{extension}"):
                    try:
                        matching_file.unlink()
                        deleted = True
                        break
                    except FileNotFoundError:
                        pass
        
        # Remove from chat sessions that reference this file
        for session_id in list(chat_sessions.keys()):
            session = chat_sessions[session_id]
            if file_id in session.file_ids:
                session.file_ids.remove(file_id)
                # If no files left in session, remove the session
                if not session.file_ids:
                    del chat_sessions[session_id]
        
        if deleted:
            return {"message": f"File {file_id} deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
            
    except Exception as e:
        logger.error(f"Error deleting file {file_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
