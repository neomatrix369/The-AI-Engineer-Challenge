#!/usr/bin/env python3
"""
Test script to verify logging setup works correctly.
This script tests both file and console logging.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the logging setup from app.py
from app import get_logger
import time

def test_logging():
    """Test the logging functionality"""
    logger = get_logger("test")
    
    # Test different log levels
    logger.debug("This is a debug message")
    logger.info("This is an info message")
    logger.warning("This is a warning message")
    logger.error("This is an error message")
    
    # Test with structured data
    logger.info("Testing with data: %s", {"key": "value", "number": 42})
    
    # Test performance logging
    start_time = time.time()
    time.sleep(0.1)  # Simulate some work
    elapsed = time.time() - start_time
    logger.info("Operation completed in %.3f seconds", elapsed)
    
    # Test error logging
    try:
        raise ValueError("This is a test error")
    except Exception as e:
        logger.error("Caught exception: %s", str(e), exc_info=True)
    
    print("✅ Logging test completed. Check the logs/ directory for log files.")

if __name__ == "__main__":
    test_logging() 