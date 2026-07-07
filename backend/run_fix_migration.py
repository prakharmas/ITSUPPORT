"""
Fix time tracking migration - handles existing columns gracefully
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:password@localhost/itsupport")

def run_migration():
    """Run the fix migration"""
    engine = create_engine(DATABASE_URL)
    
    print("🚀 Fixing time tracking migration...")
    
    try:
        with engine.connect() as conn:
            # Try to add estimated_hours column
            try:
                print("Adding estimated_hours column to work_items...")
                conn.execute(text("ALTER TABLE work_items ADD COLUMN estimated_hours DECIMAL(5, 2) NULL COMMENT 'Estimated time in hours'"))
                conn.commit()
                print("✅ estimated_hours column added successfully")
            except Exception as e:
                if "Duplicate column name" in str(e):
                    print("✅ estimated_hours column already exists")
                else:
                    print(f"⚠️  Error adding estimated_hours: {e}")
                conn.rollback()
            
            # Try to create index 1
            try:
                print("Creating index idx_time_entries_logged_at...")
                conn.execute(text("CREATE INDEX idx_time_entries_logged_at ON time_entries(logged_at)"))
                conn.commit()
                print("✅ Index idx_time_entries_logged_at created successfully")
            except Exception as e:
                if "Duplicate key name" in str(e):
                    print("✅ Index idx_time_entries_logged_at already exists")
                else:
                    print(f"⚠️  Error creating index: {e}")
                conn.rollback()
            
            # Try to create index 2
            try:
                print("Creating index idx_time_entries_user_logged...")
                conn.execute(text("CREATE INDEX idx_time_entries_user_logged ON time_entries(user_id, logged_at)"))
                conn.commit()
                print("✅ Index idx_time_entries_user_logged created successfully")
            except Exception as e:
                if "Duplicate key name" in str(e):
                    print("✅ Index idx_time_entries_user_logged already exists")
                else:
                    print(f"⚠️  Error creating index: {e}")
                conn.rollback()
        
        print("\n✅ Time tracking migration fixed successfully!")
        print("\n🔄 Please restart your backend server.")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    run_migration()









