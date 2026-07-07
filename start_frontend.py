#!/usr/bin/env python3
"""
IT Support Tool - Frontend Server
Start only the frontend development server
"""

import subprocess
from pathlib import Path

def main():
    print("📱 IT Support Tool - Frontend Server")
    print("=" * 40)
    
    # Check if package.json exists
    package_json = Path("package.json")
    if not package_json.exists():
        print("❌ package.json not found!")
        print("📝 Make sure you're in the project root directory")
        return
    
    print("🚀 Starting frontend development server...")
    print("📱 Frontend will be available at: http://localhost:3000")
    print("🔧 Make sure the backend is running on: http://localhost:8000")
    print("\n⏹️  Press Ctrl+C to stop the server")
    
    try:
        # Start npm dev server
        subprocess.run(["npm", "run", "dev"])
    except KeyboardInterrupt:
        print("\n✅ Frontend server stopped")

if __name__ == "__main__":
    main()
