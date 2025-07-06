<p align = "center" draggable=”false” ><img src="https://github.com/AI-Maker-Space/LLM-Dev-101/assets/37101144/d1343317-fa2f-41e1-8af1-1dbb18399719" 
     width="200px"
     height="auto"/>
</p>


## <h1 align="center" id="heading"> 👋 Welcome to the AI Engineer Challenge</h1>

## 🤖 Your First Vibe Coding LLM Application

> If you are a novice, and need a bit more help to get your dev environment off the ground, check out this [Setup Guide](docs/GIT_SETUP.md). This guide will walk you through the 'git' setup you need to get started.

> For additional context on LLM development environments and API key setup, you can also check out our [Interactive Dev Environment for LLM Development](https://github.com/AI-Maker-Space/Interactive-Dev-Environment-for-AI-Engineers).

In this repository, we'll walk you through the steps to create a LLM (Large Language Model) powered application with a vibe-coded frontend!

Are you ready? Let's get started!

<details>
  <summary>🖥️ Accessing "gpt-4.1-mini" (ChatGPT) like a developer</summary>

1. Head to [this notebook](https://colab.research.google.com/drive/1sT7rzY_Lb1_wS0ELI1JJfff0NUEcSD72?usp=sharing) and follow along with the instructions!

2. Complete the notebook and try out your own system/assistant messages!

That's it! Head to the next step and start building your application!

</details>


<details>
  <summary>🏗️ Forking & Cloning This Repository</summary>

Before you begin, make sure you have:

1. 👤 A GitHub account (you'll need to replace `YOUR_GITHUB_USERNAME` with your actual username)
2. 🔧 Git installed on your local machine
3. 💻 A code editor (like Cursor, VS Code, etc.)
4. ⌨️ Terminal access (Mac/Linux) or Command Prompt/PowerShell (Windows)
5. 🔑 A GitHub Personal Access Token (for authentication)

Got everything in place? Let's move on!

1. Fork [this](https://github.com/AI-Maker-Space/The-AI-Engineer-Challenge) repo!

     ![image](https://i.imgur.com/bhjySNh.png)

1. Clone your newly created repo.

     ``` bash
     # First, navigate to where you want the project folder to be created
     cd PATH_TO_DESIRED_PARENT_DIRECTORY

     # Then clone (this will create a new folder called The-AI-Engineer-Challenge)
     git clone git@github.com:<YOUR GITHUB USERNAME>/The-AI-Engineer-Challenge.git
     ```

     > Note: This command uses SSH. If you haven't set up SSH with GitHub, the command will fail. In that case, use HTTPS by replacing `git@github.com:` with `https://github.com/` - you'll then be prompted for your GitHub username and personal access token.

2. Verify your git setup:

     ```bash
     # Check that your remote is set up correctly
     git remote -v

     # Check the status of your repository
     git status

     # See which branch you're on
     git branch
     ```

     <!-- > Need more help with git? Check out our [Detailed Git Setup Guide](docs/GIT_SETUP.md) for a comprehensive walkthrough of git configuration and best practices. -->

3. Open the freshly cloned repository inside Cursor!

     ```bash
     cd The-AI-Engineering-Challenge
     cursor .
     ```

4. Check out the existing backend code found in `/api/app.py`

</details>

<details>
  <summary>🔥Setting Up for Vibe Coding Success </summary>

While it is a bit counter-intuitive to set things up before jumping into vibe-coding - it's important to remember that there exists a gradient betweeen AI-Assisted Development and Vibe-Coding. We're only reaching *slightly* into AI-Assisted Development for this challenge, but it's worth it!

1. Check out the rules in `.cursor/rules/` and add theme-ing information like colour schemes in `frontend-rule.mdc`! You can be as expressive as you'd like in these rules!
2. We're going to index some docs to make our application more likely to succeed. To do this - we're going to start with `CTRL+SHIFT+P` (or `CMD+SHIFT+P` on Mac) and we're going to type "custom doc" into the search bar. 

     ![image](https://i.imgur.com/ILx3hZu.png)
3. We're then going to copy and paste `https://nextjs.org/docs` into the prompt.

     ![image](https://i.imgur.com/psBjpQd.png)

4. We're then going to use the default configs to add these docs to our available and indexed documents.

     ![image](https://i.imgur.com/LULLeaF.png)

5. After that - you will do the same with Vercel's documentation. After which you should see:

     ![image](https://i.imgur.com/hjyXhhC.png) 

</details>

<details>
  <summary>😎 Vibe Coding a Front End for the FastAPI Backend</summary>

1. Use `Command-L` or `CTRL-L` to open the Cursor chat console. 

2. Set the chat settings to the following:

     ![image](https://i.imgur.com/LSgRSgF.png)

3. Ask Cursor to create a frontend for your application. Iterate as much as you like!

4. Run the frontend using the instructions Cursor provided. 

> NOTE: If you run into any errors, copy and paste them back into the Cursor chat window - and ask Cursor to fix them!

> NOTE: You have been provided with a backend in the `/api` folder - please ensure your Front End integrates with it!

</details>

<details>
  <summary>🚀 Deploying Your First LLM-powered Application with Vercel</summary>

1. Ensure you have signed into [Vercel](https://vercel.com/) with your GitHub account.

2. Ensure you have `npm` (this may have been installed in the previous vibe-coding step!) - if you need help with that, ask Cursor!

3. Run the command:

     ```bash
     npm install -g vercel
     ```

4. Run the command:

     ```bash
     vercel
     ```

5. Follow the in-terminal instructions. (Below is an example of what you will see!)

     ![image](https://i.imgur.com/D1iKGCq.png)

6. Once the build is completed - head to the provided link and try out your app!

> NOTE: Remember, if you run into any errors - ask Cursor to help you fix them!

</details>

### Vercel Link to Share

You'll want to make sure you share you *domains* hyperlink to ensure people can access your app!

![image](https://i.imgur.com/mpXIgIz.png)

> NOTE: Test this is the public link by trying to open your newly deployed site in an Incognito browser tab!

### 🎉 Congratulations! 

You just deployed your first LLM-powered application! 🚀🚀🚀 Get on linkedin and post your results and experience! Make sure to tag us at @AIMakerspace!

Here's a template to get your post started!

```
🚀🎉 Exciting News! 🎉🚀

🏗️ Today, I'm thrilled to announce that I've successfully built and shipped my first-ever LLM using the powerful combination of , and the OpenAI API! 🖥️

Check it out 👇
[LINK TO APP]

A big shoutout to the @AI Makerspace for all making this possible. Couldn't have done it without the incredible community there. 🤗🙏

Looking forward to building with the community! 🙌✨ Here's to many more creations ahead! 🥂🎉

Who else is diving into the world of AI? Let's connect! 🌐💡

#FirstLLMApp 
```

## Running the Application

### Environment Setup

Before running the application, you need to set up environment variables:

1. **Backend Environment Variables** (create `.env` file in the root directory):
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **Frontend Environment Variables** (create `.env.local` file in the `frontend` directory):
   ```bash
   NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

   > **Note**: The `NEXT_PUBLIC_OPENAI_API_KEY` is required for client-side PDF processing and indexing when running on read-only environments like Vercel.

### Backend (API)

To run the backend API, execute the following commands from the **root of the project folder**:

```bash
export PYTHONPATH=.
python api/app.py
```

- `export PYTHONPATH=.` ensures the `aimakerspace` library is available for imports.
- `python api/app.py` starts the FastAPI backend server.

### Frontend

To run the frontend, execute the following commands from the **frontend directory**:

```bash
cd frontend
npm install
npm run build
npx next dev
```

- `npm install` installs all required dependencies
- `npm run build` builds the application for production
- `npx next dev` starts the Next.js development server

The application will be available at `http://localhost:3000` and will connect to the backend at `http://localhost:8000`.

---

For more details on each feature and development workflow, see the `MERGE.md` and `docs/PLAN.md` files.

# 🚀 Multi-Format RAG Chat Application

A powerful Retrieval-Augmented Generation (RAG) chat application that supports multiple file formats including PDF, CSV, JSON, Markdown, and text files. Built with Next.js, FastAPI, and OpenAI, featuring **Qdrant vector database** for production-ready document storage and retrieval.

## ✨ Features

### 🔧 **Multi-Format Support**
- **PDF**: Advanced text extraction with multiple fallback methods
- **CSV**: Structured data processing with column headers
- **JSON**: Hierarchical object flattening and processing
- **Markdown**: Direct text processing with formatting preserved
- **Text**: Simple text file processing

### 🗄️ **Flexible Storage Options**
- **Qdrant Vector Database**: Production-ready, persistent storage
- **In-Memory Storage**: Fast development and testing
- **Browser Storage**: Read-only environment support (Vercel)

### 🎛️ **Smart Feature Flags**
- Environment detection (local vs Vercel)
- Configurable vector store selection
- Automatic fallback mechanisms
- No data loss during migrations

### 🤖 **Advanced RAG Capabilities**
- Semantic search across multiple files
- Chat history with context preservation
- Domain-specific and persona-based guidance
- Real-time streaming responses

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Vector Store  │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (Qdrant)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Browser Storage │    │ OpenAI API      │    │ In-Memory       │
│ (Fallback)      │    │ (Embeddings)    │    │ (Development)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and Python 3.8+
- OpenAI API key
- Qdrant cluster (optional, for production)

### 1. Clone and Setup
```bash
git clone <your-repo>
cd The-AI-Engineer-Challenge
```

### 2. Backend Setup
```bash
cd api
pip install -r requirements.txt

# Create environment file
cp env.example .env
# Edit .env with your OpenAI API key
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local with your API URL
```

### 4. Start Development
```bash
# Terminal 1: Backend
cd api
uvicorn app:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

## 🌍 Environment Configuration

### Local Development
```bash
# Backend (.env)
OPENAI_API_KEY=your-openai-api-key
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-qdrant-api-key
USE_QDRANT=true
USE_BROWSER_STORAGE=false

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_QDRANT=true
NEXT_PUBLIC_USE_BROWSER_STORAGE=false
NEXT_PUBLIC_VERCEL=false
```

### Vercel Deployment
```bash
# Backend Environment Variables
OPENAI_API_KEY=your-openai-api-key
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key
USE_QDRANT=true
USE_BROWSER_STORAGE=false

# Frontend Environment Variables
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
NEXT_PUBLIC_USE_QDRANT=true
NEXT_PUBLIC_USE_BROWSER_STORAGE=false
NEXT_PUBLIC_VERCEL=true
```

## 🔄 Feature Flag Behavior

| Environment | USE_QDRANT | USE_BROWSER_STORAGE | Vector Store | Behavior |
|-------------|------------|---------------------|--------------|----------|
| Local | `false` | `true` | Memory | In-memory storage |
| Local | `true` | `false` | Qdrant | Qdrant vector database |
| Vercel | `false` | `true` | Browser | Browser storage + memory |
| Vercel | `true` | `false` | Qdrant | Qdrant vector database |

## 📊 Storage Comparison

| Feature | Qdrant | In-Memory | Browser Storage |
|---------|--------|-----------|-----------------|
| Persistence | ✅ Yes | ❌ No | ✅ Yes |
| Scalability | ✅ High | ❌ Low | ❌ Low |
| Performance | ✅ Fast | ✅ Fast | ⚠️ Medium |
| Cost | 💰 Paid | 🆓 Free | 🆓 Free |
| Setup | 🔧 Complex | 🎯 Simple | 🎯 Simple |

## 🔧 Qdrant Setup

### Option 1: Qdrant Cloud (Recommended)
1. Sign up at [Qdrant Cloud](https://cloud.qdrant.io/)
2. Create a cluster and get your credentials
3. Configure environment variables

### Option 2: Self-hosted
```bash
# Using Docker
docker run -p 6333:6333 qdrant/qdrant

# Or using Docker Compose
docker-compose up -d
```

## 🛠️ API Endpoints

### Core Endpoints
- `POST /api/upload-file` - Upload and index files
- `POST /api/chat-file` - Chat with indexed files
- `POST /api/chat` - General chat without file context
- `GET /api/files` - List uploaded files
- `GET /api/health` - Health check with feature flags

### File Management
- `GET /api/files/{file_id}/status` - Get file indexing status
- `DELETE /api/files/{file_id}` - Delete specific file
- `DELETE /api/files` - Delete all files

### Browser Storage
- `POST /api/pre-indexed-file` - Accept pre-indexed file data

## 🔍 Monitoring

### Health Check
```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "readonly": true,
  "environment": "vercel",
  "vector_store": "qdrant",
  "browser_storage": false,
  "features": {
    "qdrant": true,
    "browser_storage": false,
    "readonly": true
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **"Cannot read properties of undefined"**
   - ✅ Fixed: Added safety checks for files array
   - Ensure proper initialization of state

2. **Qdrant Connection Failed**
   - Check `QDRANT_URL` and `QDRANT_API_KEY`
   - Verify network connectivity
   - Check Qdrant cluster status

3. **Feature Flag Conflicts**
   - Ensure consistent environment variables
   - Check frontend/backend configuration
   - Verify environment detection

## 📈 Performance Tips

### Qdrant Optimizations
- Use batch operations for multiple documents
- Implement proper indexing for fast searches
- Monitor collection statistics via dashboard
- Scale cluster as needed

### Memory Management
- Reduced memory footprint with persistent storage
- Better garbage collection with external database
- Scalable architecture for large datasets

## 🔐 Security

### API Key Management
- Use environment variables for all keys
- Implement key rotation procedures
- Use least privilege access

### Data Privacy
- Qdrant stores document chunks and embeddings
- Implement data retention policies
- Consider data deletion procedures

## 📚 Documentation

- [`docs/QDRANT_SETUP.md`](docs/QDRANT_SETUP.md) - Detailed Qdrant setup guide
- [`docs/QDRANT_IMPLEMENTATION.md`](docs/QDRANT_IMPLEMENTATION.md) - Implementation details
- [`api/env.example`](api/env.example) - Environment variable examples
- [`frontend/src/config/features.ts`](frontend/src/config/features.ts) - Feature flag documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

- [ ] Advanced PDF processing with OCR
- [ ] Multi-language support
- [ ] Real-time collaboration
- [ ] Advanced analytics dashboard
- [ ] Mobile app support
- [ ] Enterprise features

---

**Built with ❤️ using Next.js, FastAPI, OpenAI, and Qdrant**
