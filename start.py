#!/usr/bin/env python3
"""
IT Support Tool Startup Script
This script helps you get started quickly with the IT Support Tool.
"""

import os
import sys
import subprocess
import time
from pathlib import Path

def check_python_version():
    """Check if Python version is 3.8+"""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ is required")
        sys.exit(1)
    print("✅ Python version check passed")

def check_node_version():
    """Check if Node.js is installed"""
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Node.js {result.stdout.strip()} found")
        else:
            print("❌ Node.js not found. Please install Node.js 16+")
            sys.exit(1)
    except FileNotFoundError:
        print("❌ Node.js not found. Please install Node.js 16+")
        sys.exit(1)

def check_mysql():
    """Check if MySQL is available"""
    try:
        result = subprocess.run(['mysql', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ MySQL found: {result.stdout.strip()}")
        else:
            print("⚠️  MySQL not found. Please install MySQL or use Docker")
    except FileNotFoundError:
        print("⚠️  MySQL not found. Please install MySQL or use Docker")

def setup_backend():
    """Setup backend dependencies"""
    print("\n🔧 Setting up backend...")
    
    # Check if virtual environment exists
    venv_path = Path("venv")
    if not venv_path.exists():
        print("Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"])
    
    # Activate virtual environment and install dependencies
    if os.name == 'nt':  # Windows
        activate_script = venv_path / "Scripts" / "activate.bat"
        pip_path = venv_path / "Scripts" / "pip"
    else:  # Unix/Linux/MacOS
        activate_script = venv_path / "bin" / "activate"
        pip_path = venv_path / "bin" / "pip"
    
    print("Installing Python dependencies...")
    subprocess.run([str(pip_path), "install", "-r", "requirements.txt"])
    print("✅ Backend setup complete")

def setup_frontend():
    """Setup frontend dependencies"""
    print("\n🔧 Setting up frontend...")
    subprocess.run(["npm", "install"])
    print("✅ Frontend setup complete")

def check_env_file():
    """Check if .env file exists"""
    env_file = Path(".env")
    if not env_file.exists():
        print("\n⚠️  .env file not found. Creating from template...")
        env_example = Path("env.example")
        if env_example.exists():
            env_file.write_text(env_example.read_text())
            print("✅ .env file created from template")
            print("📝 Please edit .env file with your configuration")
        else:
            print("❌ env.example file not found")
    else:
        print("✅ .env file found")

def start_services():
    """Start backend and frontend services"""
    print("\n🚀 Starting services...")
    
    # Start backend
    print("Starting backend server...")
    backend_process = subprocess.Popen([
        sys.executable, "backend/main.py"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Wait a bit for backend to start
    time.sleep(3)
    
    # Start frontend
    print("Starting frontend server...")
    frontend_process = subprocess.Popen([
        "npm", "run", "dev"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    print("\n🎉 Services started!")
    print("📱 Frontend: http://localhost:3000")
    print("🔧 Backend API: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("\n💡 Default login credentials:")
    print("   PM User: pm@example.com / password123")
    print("   Dev User: dev@example.com / password123")
    print("\n⏹️  Press Ctrl+C to stop all services")
    
    try:
        # Wait for processes
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\n🛑 Stopping services...")
        backend_process.terminate()
        frontend_process.terminate()
        print("✅ Services stopped")

def main():
    """Main startup function"""
    print("🎯 IT Support Tool - Quick Start")
    print("=" * 40)
    
    # Check prerequisites
    check_python_version()
    check_node_version()
    check_mysql()
    
    # Setup
    setup_backend()
    setup_frontend()
    check_env_file()
    
    # Ask user if they want to start services
    response = input("\n🚀 Ready to start services? (y/n): ").lower().strip()
    if response in ['y', 'yes']:
        start_services()
    else:
        print("\n📝 Setup complete! To start manually:")
        print("   Backend: python backend/main.py")
        print("   Frontend: npm run dev")

if __name__ == "__main__":
    main()
