import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection
db_config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'itsupport')
}

try:
    # Connect to database
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    
    print("🔄 Running notification system migrations...")
    
    # Read and execute notifications SQL
    with open('create_notifications_tables.sql', 'r') as f:
        sql_content = f.read()
        # Split by semicolon and execute each statement
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        for statement in statements:
            cursor.execute(statement)
            print(f"✅ Executed: {statement[:50]}...")
    
    # Read and execute activity reports SQL
    with open('create_activity_reports_table.sql', 'r') as f:
        sql_content = f.read()
        statements = [stmt.strip() for stmt in sql_content.split(';') if stmt.strip()]
        for statement in statements:
            cursor.execute(statement)
            print(f"✅ Executed: {statement[:50]}...")
    
    conn.commit()
    print("\n✅ All migrations completed successfully!")
    print("\n📋 Created tables:")
    print("   - notifications")
    print("   - notification_preferences")
    print("   - activity_reports")
    
    # Show table counts
    cursor.execute("SELECT COUNT(*) FROM notifications")
    notif_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM notification_preferences")
    pref_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM activity_reports")
    activity_count = cursor.fetchone()[0]
    
    print(f"\n📊 Current data:")
    print(f"   - Notifications: {notif_count}")
    print(f"   - Preferences: {pref_count}")
    print(f"   - Activity Reports: {activity_count}")
    
except mysql.connector.Error as e:
    print(f"❌ Error: {e}")
finally:
    if conn.is_connected():
        cursor.close()
        conn.close()
        print("\n🔌 Database connection closed")










