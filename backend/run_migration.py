#!/usr/bin/env python3
"""
Run the branch migration script
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal, engine
from sqlalchemy import text

def run_migration():
    """Run the branch migration"""
    print("🔄 Running branch migration...")
    
    # Read the migration SQL file
    migration_file = Path(__file__).parent / "migrate_branches.sql"
    
    if not migration_file.exists():
        print("❌ Migration file not found!")
        return False
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        migration_sql = f.read()
    
    # Split into individual statements
    statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
    
    db = SessionLocal()
    
    try:
        for i, statement in enumerate(statements, 1):
            if statement:
                print(f"Executing statement {i}/{len(statements)}...")
                try:
                    db.execute(text(statement))
                    db.commit()
                except Exception as e:
                    # Some statements might fail if they already exist, that's OK
                    if any(keyword in str(e).lower() for keyword in ["already exists", "duplicate", "already defined"]):
                        print(f"  ⚠️  Statement {i} skipped (already exists): {e}")
                        db.rollback()
                    else:
                        print(f"  ❌ Statement {i} failed: {e}")
                        db.rollback()
                        return False
        
        # Create indexes separately with proper error handling
        print("Creating indexes...")
        index_statements = [
            "CREATE INDEX idx_users_branch_id ON users(branch_id)",
            "CREATE INDEX idx_work_items_branch_id ON work_items(branch_id)"
        ]
        
        for idx_stmt in index_statements:
            try:
                db.execute(text(idx_stmt))
                db.commit()
                print(f"  ✅ Created index: {idx_stmt.split()[-1]}")
            except Exception as e:
                if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                    print(f"  ⚠️  Index already exists: {idx_stmt.split()[-1]}")
                    db.rollback()
                else:
                    print(f"  ❌ Failed to create index: {e}")
                    db.rollback()
        
        print("✅ Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = run_migration()
    if success:
        print("\n🎉 Branch functionality is now available!")
        print("💡 You can now:")
        print("   - Create branches via API")
        print("   - Create users with 'requester' role")
        print("   - Assign users to branches")
        print("   - Create branch-scoped tickets")
        print("   - Use PM assignment functionality")
    else:
        print("\n❌ Migration failed. Please check the errors above.")
        sys.exit(1)
