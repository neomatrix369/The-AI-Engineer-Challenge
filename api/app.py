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

load_dotenv()

# Initialize FastAPI application with a title
app = FastAPI(title="OpenAI Chat API")

# Get the frontend URL from environment or use a default
FRONTEND_URL = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3000")

# Create uploads directory if it doesn't exist
UPLOADS_DIR = Path("uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

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

class PDFUploadResponse(BaseModel):
    filename: str
    file_id: str
    message: str

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
        
        return PDFUploadResponse(
            filename=file.filename,
            file_id=file_id,
            message="PDF uploaded successfully"
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
            
            pdf_files.append({
                "file_id": file_id,
                "original_filename": original_name,
                "uploaded_at": file_path.stat().st_mtime
            })
        
        return {"pdfs": pdf_files}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list PDFs: {str(e)}")

# Define a health check endpoint to verify API status
@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Entry point for running the application directly
if __name__ == "__main__":
    import uvicorn
    # Start the server on all network interfaces (0.0.0.0) on port 8000
    uvicorn.run(app, host="0.0.0.0", port=8000)
