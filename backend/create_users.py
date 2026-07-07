#!/usr/bin/env python3
"""
Create fresh users with correct password hashes
Run this script to create new users or reset existing ones
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

def create_users():
    """Create fresh users with correct password hashes"""
    print("👥 Creating fresh users...")
    
    # Initialize database
    init_db()
    
    # Get database session
    db = SessionLocal()
    
    try:
        # Check if users already exist
        existing_users = db.query(User).all()
        if existing_users:
            print(f"Found {len(existing_users)} existing users. Updating passwords...")
            for user in existing_users:
                user.password_hash = get_password_hash("password123")
                user.is_active = True
            db.commit()
            print("✅ Updated existing users with fresh passwords")
        else:
            print("No existing users found. Creating new users...")
            
            # Create PM user
            pm_user = User(
                name="Product Manager",
                email="pm@example.com",
                password_hash=get_password_hash("password123"),
                role="pm",
                is_active=True
            )
            db.add(pm_user)
            print("✅ Created PM user: pm@example.com")
            
            # Create Dev user
            dev_user = User(
                name="Developer",
                email="dev@example.com",
                password_hash=get_password_hash("password123"),
                role="dev",
                is_active=True
            )
            db.add(dev_user)
            print("✅ Created Dev user: dev@example.com")
            
            # Create additional dev user
            dev_user2 = User(
                name="Developer 2",
                email="dev2@example.com",
                password_hash=get_password_hash("password123"),
                role="dev",
                is_active=True
            )
            db.add(dev_user2)
            print("✅ Created Dev user: dev2@example.com")
            
            # Commit changes
            db.commit()
            print("\n🎉 All users created successfully!")
            
        print("💡 Login credentials:")
        print("   PM: pm@example.com / password123")
        print("   Dev: dev@example.com / password123")
        print("   Dev2: dev2@example.com / password123")
        
    except Exception as e:
        print(f"❌ Error creating users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_users()
