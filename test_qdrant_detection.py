#!/usr/bin/env python3
"""
Test script to debug Qdrant detection in Vercel environment
"""

import os
from pathlib import Path

def test_environment_detection():
    """Test environment variable detection"""
    print("🔍 Environment Detection Test")
    print("=" * 50)
    
    # Check Vercel environment
    vercel_env = os.getenv("VERCEL") == "1"
    print(f"VERCEL environment: {vercel_env}")
    
    # Check Qdrant variables
    use_qdrant = os.getenv("USE_QDRANT", "false").lower() == "true"
    qdrant_url = os.getenv("QDRANT_URL")
    qdrant_api_key = os.getenv("QDRANT_API_KEY")
    
    print(f"USE_QDRANT: {os.getenv('USE_QDRANT')} -> {use_qdrant}")
    print(f"QDRANT_URL: {qdrant_url}")
    print(f"QDRANT_API_KEY: {'Set' if qdrant_api_key else 'Not set'}")
    
    # Check browser storage
    use_browser_storage = os.getenv("USE_BROWSER_STORAGE", "true").lower() == "true"
    print(f"USE_BROWSER_STORAGE: {os.getenv('USE_BROWSER_STORAGE')} -> {use_browser_storage}")
    
    # Auto-detection logic
    if vercel_env and os.getenv("USE_QDRANT") is None:
        if qdrant_url and qdrant_api_key:
            print("🚀 Auto-detecting Qdrant for Vercel environment")
            use_qdrant = True
        else:
            print("⚠️ Vercel environment detected but Qdrant credentials not found")
    
    print("\n📊 Final Configuration:")
    print(f"   - Vector Store: {'Qdrant' if use_qdrant else 'Memory'}")
    print(f"   - Browser Storage: {use_browser_storage}")
    print(f"   - Environment: {'Vercel' if vercel_env else 'Local'}")
    
    # Test file system access
    print("\n🔧 File System Test:")
    try:
        test_dir = Path("test_write")
        test_dir.mkdir(exist_ok=True)
        test_file = test_dir / "test.txt"
        with open(test_file, 'w') as f:
            f.write("test")
        os.remove(test_file)
        test_dir.rmdir()
        print("   ✅ File system is writable")
        readonly = False
    except (OSError, PermissionError) as e:
        print(f"   ❌ File system is read-only: {e}")
        readonly = True
    
    print(f"   - Read-only environment: {readonly}")

if __name__ == "__main__":
    test_environment_detection() 