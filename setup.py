#!/usr/bin/env python3
"""
IT Support Tool - Setup Script
Install dependencies and setup the project
"""

import os
import sys
import subprocess
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

def setup_backend():
    """Setup backend dependencies"""
    print("\n🔧 Setting up backend...")
    
    backend_dir = Path("backend")
    if not backend_dir.exists():
        print("❌ Backend directory not found!")
        return False
    
    # Check if virtual environment exists
    venv_path = Path("venv")
    if not venv_path.exists():
        print("Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"])
    
    # Activate virtual environment and install dependencies
    if os.name == 'nt':  # Windows
        pip_path = venv_path / "Scripts" / "pip"
    else:  # Unix/Linux/MacOS
        pip_path = venv_path / "bin" / "pip"
    
    print("Installing Python dependencies...")
    subprocess.run([str(pip_path), "install", "-r", "backend/requirements.txt"])
    print("✅ Backend setup complete")
    return True

def setup_frontend():
    """Setup frontend dependencies"""
    print("\n🔧 Setting up frontend...")
    subprocess.run(["npm", "install"])
    print("✅ Frontend setup complete")
    return True

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

def main():
    print("🎯 IT Support Tool - Setup")
    print("=" * 40)
    
    # Check prerequisites
    check_python_version()
    check_node_version()
    
    # Setup
    backend_ok = setup_backend()
    frontend_ok = setup_frontend()
    check_env_file()
    
    if backend_ok and frontend_ok:
        print("\n🎉 Setup complete!")
        print("\n📝 Next steps:")
        print("1. Edit .env file with your database and email settings")
        print("2. Set up MySQL database:")
        print("   mysql -u root -p")
        print("   CREATE DATABASE itsupport;")
        print("   mysql -u root -p itsupport < database_init.sql")
        print("\n🚀 To start the services:")
        print("   Backend only:  python start_backend.py")
        print("   Frontend only: python start_frontend.py")
        print("   Both services: python run.py")
    else:
        print("\n❌ Setup failed. Please check the errors above.")

if __name__ == "__main__":
    main()
