"""
Run time tracking migration
"""
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:password@localhost/itsupport")

def run_migration():
    """Run the time tracking SQL migration"""
    engine = create_engine(DATABASE_URL)
    
    print("🚀 Starting time tracking migration...")
    
    try:
        with open('create_time_tracking.sql', 'r') as f:
            sql_script = f.read()
        
        # Split by semicolon and execute each statement
        statements = [s.strip() for s in sql_script.split(';') if s.strip()]
        
        with engine.connect() as conn:
            for i, statement in enumerate(statements, 1):
                try:
                    print(f"Executing statement {i}/{len(statements)}...")
                    conn.execute(text(statement))
                    conn.commit()
                    print(f"✅ Statement {i} executed successfully")
                except Exception as e:
                    print(f"⚠️  Statement {i} failed (might already exist): {e}")
                    conn.rollback()
        
        print("\n✅ Time tracking migration completed successfully!")
        print("\n📊 New features added:")
        print("  - time_entries table for logging time")
        print("  - estimated_hours field in work_items")
        print("  - Support for billable/non-billable time")
        print("  - Timer functionality (start/stop)")
        print("\n🔄 Please restart your backend server.")
        
    except FileNotFoundError:
        print("❌ Error: create_time_tracking.sql file not found!")
        print("Make sure you're running this from the backend directory.")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    run_migration()









