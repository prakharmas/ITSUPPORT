#!/usr/bin/env python3
"""
Update password hashes in the database
Run this script to fix password hashing issues
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal, init_db
from app.models.user import User
from app.auth import get_password_hash

def update_passwords():
    """Update all user passwords with new hash"""
    print("🔐 Updating password hashes...")
    
    # Initialize database
    init_db()
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Get all users
        users = db.query(User).all()
        
        if not users:
            print("❌ No users found in database")
            return
        
        print(f"Found {len(users)} users to update")
        
        # Update each user's password
        for user in users:
            print(f"Updating password for: {user.email}")
            
            # Set password to 'password123' for all users
            new_password_hash = get_password_hash("password123")
            user.password_hash = new_password_hash
            
            print(f"✅ Updated {user.email}")
        
        # Commit changes
        db.commit()
        print("\n🎉 All passwords updated successfully!")
        print("💡 Default password for all users: password123")
        
    except Exception as e:
        print(f"❌ Error updating passwords: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_passwords()
