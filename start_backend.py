#!/usr/bin/env python3
"""
IT Support Tool - Backend Server
Start only the backend with uvicorn
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    print("🔧 IT Support Tool - Backend Server")
    print("=" * 40)
    
    # Check if backend directory exists
    backend_dir = Path("backend")
    if not backend_dir.exists():
        print("❌ Backend directory not found!")
        sys.exit(1)
    
    # Check if requirements.txt exists
    requirements_file = backend_dir / "requirements.txt"
    if not requirements_file.exists():
        print("❌ backend/requirements.txt not found!")
        sys.exit(1)
    
    # Check if .env exists
    env_file = Path(".env")
    if not env_file.exists():
        print("⚠️  .env file not found!")
        print("📝 Please copy env.example to .env and configure your settings")
        print("   cp env.example .env")
        sys.exit(1)
    
    # Check if database is set up
    print("📊 Make sure your MySQL database is set up:")
    print("   mysql -u root -p itsupport < database_init.sql")
    
    # Change to backend directory
    os.chdir("backend")
    
    print("\n🚀 Starting backend server with uvicorn...")
    print("📚 API Docs will be available at: http://localhost:8000/docs")
    print("🔧 Backend API: http://localhost:8000")
    print("\n⏹️  Press Ctrl+C to stop the server")
    
    try:
        # Start uvicorn server
        subprocess.run([
            "uvicorn", "main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ])
    except KeyboardInterrupt:
        print("\n✅ Backend server stopped")

if __name__ == "__main__":
    main()
