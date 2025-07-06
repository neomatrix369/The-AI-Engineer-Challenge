# Logging Setup for AI Makerspace Backend

This document describes the logging implementation for the AI Makerspace backend.

## Overview

The backend now uses Python's built-in `logging` module instead of `print` statements. This provides:

- **File logging**: All logs are saved to timestamped files in the `logs/` directory
- **Console logging**: Logs are also output to the console for real-time monitoring
- **Structured logging**: Different log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- **Performance tracking**: Detailed timing information for operations
- **Error tracking**: Full stack traces for debugging

## Log Files

Log files are created in the `logs/` directory with the following naming convention:
```
logs/ai_makerspace_YYYYMMDD_HHMMSS.log
```

Example: `logs/ai_makerspace_20241201_143022.log`

## Log Levels

- **DEBUG**: Detailed information for debugging
- **INFO**: General information about program execution
- **WARNING**: Warning messages for potentially problematic situations
- **ERROR**: Error messages for serious problems
- **CRITICAL**: Critical errors that may prevent the program from running

## Environment Variables

You can control logging behavior with environment variables:

```bash
# Set log level (default: INFO)
export LOG_LEVEL=DEBUG

# Enable debug logging
export LOG_LEVEL=DEBUG

# Only show warnings and errors
export LOG_LEVEL=WARNING
```

## Usage in Code

### Basic Usage

```python
# Import the logging setup from app.py
from app import get_logger

# Get a logger instance
logger = get_logger("my_module")

# Log messages
logger.info("Processing file: %s", filename)
logger.warning("File size is large: %d bytes", file_size)
logger.error("Failed to process file: %s", str(error))
```

### Performance Logging

```python
import time

start_time = time.time()
# ... perform operation ...
elapsed = time.time() - start_time
logger.info("Operation completed in %.2f seconds", elapsed)
```

### Error Logging with Stack Traces

```python
try:
    # ... risky operation ...
except Exception as e:
    logger.error("Operation failed: %s", str(e), exc_info=True)
```

## Key Logging Points

### File Processing
- File upload initiation
- Text extraction progress
- Chunk creation and limits
- Embedding creation batches
- Vector database operations

### API Endpoints
- Health check requests
- File upload processing
- Chat request handling
- Error responses

### Environment Detection
- Vercel vs local environment
- Qdrant connection status
- Browser storage mode detection

## Testing the Logging

Run the test script to verify logging works:

```bash
cd api
python test_logging.py
```

This will create a test log file and output to console.

## Vercel Deployment

On Vercel, logs are available through:

1. **Vercel Dashboard**: Functions tab shows real-time logs
2. **Vercel CLI**: `vercel logs --follow` for live logs
3. **File Logs**: Log files are created in the `/tmp` directory on Vercel

## Troubleshooting

### No Log Files Created
- Check if the `logs/` directory exists
- Verify write permissions
- Check if the process has write access

### Missing Log Messages
- Verify log level is set correctly
- Check if logger is properly initialized
- Ensure no exceptions in logging setup

### Performance Issues
- Consider reducing log level in production
- Use structured logging for better performance
- Monitor log file sizes

## Migration from Print Statements

All `print()` statements have been replaced with appropriate logger calls:

- `print("Info message")` → `logger.info("Info message")`
- `print(f"Error: {error}")` → `logger.error("Error: %s", str(error))`
- `print("Warning")` → `logger.warning("Warning")`

## Best Practices

1. **Use appropriate log levels**: Don't use ERROR for warnings
2. **Include context**: Log relevant data for debugging
3. **Performance logging**: Track timing for slow operations
4. **Structured logging**: Use format strings for better performance
5. **Error handling**: Always log exceptions with stack traces

## Example Log Output

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

## Implementation Details

The logging configuration is now integrated directly into `app.py` to avoid import issues on Vercel. The setup includes:

- **Console Handler**: Outputs to stdout for real-time monitoring
- **File Handler**: Saves detailed logs to timestamped files
- **Error Handling**: Gracefully falls back to console-only logging if file logging fails
- **Environment Detection**: Automatically detects Vercel vs local environment 