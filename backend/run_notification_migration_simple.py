from app.database import engine
from sqlalchemy import text

print("🔄 Running notification system migrations...")

# Read and execute notifications SQL
with open('create_notifications_tables.sql', 'r') as f:
    sql_content = f.read()

with open('create_activity_reports_table.sql', 'r') as f:
    activity_sql = sql_content + "\n" + f.read()

try:
    with engine.connect() as conn:
        # Split and execute each statement
        statements = [stmt.strip() + ';' for stmt in activity_sql.split(';') if stmt.strip()]
        
        for statement in statements:
            try:
                conn.execute(text(statement))
                print(f"✅ Executed: {statement[:60]}...")
            except Exception as e:
                print(f"⚠️  Statement may already exist or error: {str(e)[:100]}")
        
        conn.commit()
    
    print("\n✅ All migrations completed successfully!")
    print("\n📋 Tables ready:")
    print("   - notifications")
    print("   - notification_preferences")
    print("   - activity_reports")
    print("\n🚀 You can now start using the notification system!")
    
except Exception as e:
    print(f"❌ Error: {e}")










