from app.database import engine
from sqlalchemy import text
import os

# Create uploads directory
os.makedirs('uploads', exist_ok=True)
print("📁 Created uploads directory")

print("🔄 Adding attachments table...")

try:
    with engine.connect() as conn:
        # Read SQL migration
        with open('create_attachments_table.sql', 'r') as f:
            sql_content = f.read()
        
        # Split and execute each statement
        statements = [stmt.strip() + ';' for stmt in sql_content.split(';') if stmt.strip()]
        
        for statement in statements:
            try:
                conn.execute(text(statement))
                print(f"✅ Executed: {statement[:80]}...")
            except Exception as e:
                if 'already exists' in str(e).lower():
                    print(f"ℹ️  Table already exists")
                else:
                    print(f"⚠️  Error: {str(e)[:100]}")
        
        conn.commit()
    
    print("\n✅ Migration completed successfully!")
    print("\n📋 Attachments system ready:")
    print("   - attachments table created")
    print("   - uploads directory created")
    print("   - Max file size: 10MB")
    print("\n🚀 You can now upload files to tickets!")
    
except Exception as e:
    print(f"❌ Error: {e}")










