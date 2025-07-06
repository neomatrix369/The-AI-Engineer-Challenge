# 🚀 Qdrant Vector Database Setup Guide

This guide explains how to set up and use Qdrant vector database with the RAG chat application.

## 📋 Overview

The application now supports multiple vector storage backends:
- **Qdrant Vector Database** (Production-ready, persistent)
- **In-Memory Storage** (Development, temporary)
- **Browser Storage** (Read-only environments like Vercel)

## 🔧 Qdrant Setup

### Option 1: Qdrant Cloud (Recommended)

1. **Sign up for Qdrant Cloud**
   - Visit [Qdrant Cloud](https://cloud.qdrant.io/)
   - Create a free account
   - Create a new cluster

2. **Get your credentials**
   - Copy the cluster URL (e.g., `https://your-cluster.qdrant.io`)
   - Copy your API key

3. **Configure environment variables**
   ```bash
   # Local development
   export QDRANT_URL="https://your-cluster.qdrant.io"
   export QDRANT_API_KEY="your-api-key"
   export USE_QDRANT="true"
   export USE_BROWSER_STORAGE="false"
   ```

### Option 2: Self-hosted Qdrant

1. **Install Qdrant**
   ```bash
   # Using Docker
   docker run -p 6333:6333 qdrant/qdrant
   
   # Or using Docker Compose
   cat > docker-compose.yml << EOF
   version: '3.7'
   services:
     qdrant:
       image: qdrant/qdrant
       ports:
         - "6333:6333"
       volumes:
         - qdrant_storage:/qdrant/storage
   
   volumes:
     qdrant_storage:
   EOF
   
   docker-compose up -d
   ```

2. **Configure environment variables**
   ```bash
   export QDRANT_URL="http://localhost:6333"
   export USE_QDRANT="true"
   export USE_BROWSER_STORAGE="false"
   ```

## 🌍 Environment Configuration

### Local Development

Create a `.env.local` file in the frontend directory:

```bash
# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_QDRANT=true
NEXT_PUBLIC_USE_BROWSER_STORAGE=false
NEXT_PUBLIC_VERCEL=false
```

Create a `.env` file in the backend directory:

```bash
# Backend (.env)
OPENAI_API_KEY=your-openai-api-key
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-qdrant-api-key
USE_QDRANT=true
USE_BROWSER_STORAGE=false
```

### Vercel Deployment

Configure environment variables in Vercel dashboard:

```bash
# Backend environment variables
OPENAI_API_KEY=your-openai-api-key
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your-qdrant-api-key
USE_QDRANT=true
USE_BROWSER_STORAGE=false

# Frontend environment variables
NEXT_PUBLIC_API_URL=https://your-app.vercel.app
NEXT_PUBLIC_USE_QDRANT=true
NEXT_PUBLIC_USE_BROWSER_STORAGE=false
NEXT_PUBLIC_VERCEL=true
```

## 🔄 Feature Flags

The application uses feature flags to control behavior:

| Flag | Description | Default |
|------|-------------|---------|
| `USE_QDRANT` | Enable Qdrant vector database | `false` |
| `USE_BROWSER_STORAGE` | Enable browser storage fallback | `true` |
| `IS_READONLY` | Auto-detected read-only environment | Auto |

### Environment Detection

- **Local**: Full file system access, can use any storage
- **Vercel**: Read-only, uses browser storage or Qdrant
- **Other**: Auto-detected based on file system permissions

## 📊 Storage Comparison

| Feature | Qdrant | In-Memory | Browser Storage |
|---------|--------|-----------|-----------------|
| Persistence | ✅ Yes | ❌ No | ✅ Yes |
| Scalability | ✅ High | ❌ Low | ❌ Low |
| Performance | ✅ Fast | ✅ Fast | ⚠️ Medium |
| Cost | 💰 Paid | 🆓 Free | 🆓 Free |
| Setup | 🔧 Complex | 🎯 Simple | 🎯 Simple |

## 🚀 Migration Guide

### From Browser Storage to Qdrant

1. **Set up Qdrant** (see setup instructions above)
2. **Configure environment variables**
3. **Deploy with new settings**
4. **Re-upload files** (they'll be stored in Qdrant)

### From In-Memory to Qdrant

1. **Set up Qdrant**
2. **Configure environment variables**
3. **Restart the application**
4. **Upload files** (they'll be stored in Qdrant)

## 🔍 Monitoring and Debugging

### Health Check Endpoint

Check the application status:

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

### Qdrant Dashboard

Access your Qdrant dashboard to monitor:
- Collection statistics
- Vector dimensions
- Search performance
- Storage usage

## 🛠️ Troubleshooting

### Common Issues

1. **Qdrant Connection Failed**
   ```
   ⚠️ Warning: Could not connect to Qdrant: Connection refused
   ⚠️ Falling back to in-memory vector database
   ```
   
   **Solution**: Check Qdrant URL and API key

2. **Collection Creation Failed**
   ```
   ❌ Error creating Qdrant collection: Permission denied
   ```
   
   **Solution**: Check API key permissions

3. **Vector Dimension Mismatch**
   ```
   ❌ Error inserting into Qdrant: Vector dimension mismatch
   ```
   
   **Solution**: Ensure collection is created with dimension 1536 (OpenAI text-embedding-3-small)

### Debug Commands

```bash
# Test Qdrant connection
curl -H "api-key: your-api-key" https://your-cluster.qdrant.io/collections

# Check collection info
curl -H "api-key: your-api-key" https://your-cluster.qdrant.io/collections/documents

# Test health endpoint
curl https://your-app.vercel.app/api/health
```

## 📈 Performance Optimization

### Qdrant Best Practices

1. **Use appropriate collection settings**
   ```python
   # Optimized for search
   vectors_config=VectorParams(
       size=1536,
       distance=Distance.COSINE,
       on_disk=True  # For large collections
   )
   ```

2. **Batch operations**
   ```python
   # Insert multiple points at once
   client.upsert(
       collection_name="documents",
       points=points_batch
   )
   ```

3. **Index optimization**
   ```python
   # Create payload index for faster filtering
   client.create_payload_index(
       collection_name="documents",
       field_name="file_id",
       field_schema="keyword"
   )
   ```

## 🔐 Security Considerations

1. **API Key Management**
   - Use environment variables
   - Rotate keys regularly
   - Use least privilege access

2. **Network Security**
   - Use HTTPS for Qdrant Cloud
   - Configure firewall rules for self-hosted
   - Use VPN for sensitive deployments

3. **Data Privacy**
   - Qdrant stores document chunks and embeddings
   - Consider data retention policies
   - Implement data deletion procedures

## 📚 Additional Resources

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Qdrant Python Client](https://github.com/qdrant/qdrant-client)
- [Vector Database Comparison](https://zilliz.com/comparison)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Qdrant logs and application logs
3. Test with the health check endpoint
4. Verify environment variable configuration
5. Check network connectivity to Qdrant

For additional help, please provide:
- Environment (local/vercel)
- Error messages
- Health check response
- Qdrant connection details (without API key) 