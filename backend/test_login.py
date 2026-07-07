#!/usr/bin/env python3
"""
Test login functionality
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal
from app.auth import verify_password
from sqlalchemy import text

def test_login():
    """Test login with default credentials"""
    print("🔐 Testing login functionality...")
    
    db = SessionLocal()
    
    try:
        # Test PM user
        result = db.execute(text("SELECT email, password_hash FROM users WHERE email = 'pm@example.com'")).fetchone()
        if result:
            if verify_password("password123", result[1]):
                print("✅ PM login successful: pm@example.com / password123")
            else:
                print("❌ PM login failed: password verification failed")
        else:
            print("❌ PM user not found")
        
        # Test Dev user
        result = db.execute(text("SELECT email, password_hash FROM users WHERE email = 'dev@example.com'")).fetchone()
        if result:
            if verify_password("password123", result[1]):
                print("✅ Dev login successful: dev@example.com / password123")
            else:
                print("❌ Dev login failed: password verification failed")
        else:
            print("❌ Dev user not found")
            
    except Exception as e:
        print(f"❌ Error testing login: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_login()
