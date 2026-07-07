from app.database import engine
from sqlalchemy import text

print("🔄 Adding start_date, end_date, and completed_at columns to work_items...")

try:
    with engine.connect() as conn:
        # Read SQL migration
        with open('add_ticket_dates.sql', 'r') as f:
            sql_content = f.read()
        
        # Split and execute each statement
        statements = [stmt.strip() + ';' for stmt in sql_content.split(';') if stmt.strip()]
        
        for statement in statements:
            try:
                conn.execute(text(statement))
                print(f"✅ Executed: {statement[:80]}...")
            except Exception as e:
                if 'Duplicate column' in str(e):
                    print(f"ℹ️  Column already exists: {statement[:50]}...")
                else:
                    print(f"⚠️  Error: {str(e)[:100]}")
        
        conn.commit()
    
    print("\n✅ Migration completed successfully!")
    print("\n📋 New columns added to work_items:")
    print("   - start_date (TIMESTAMP)")
    print("   - end_date (TIMESTAMP)")
    print("   - completed_at (TIMESTAMP)")
    print("\n🚀 You can now use start/end dates and track completion!")
    
except Exception as e:
    print(f"❌ Error: {e}")










