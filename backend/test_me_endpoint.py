#!/usr/bin/env python3
"""
Test the /items?assignee_id=me endpoint
"""

import requests

def test_me_endpoint():
    """Test the me endpoint"""
    print("🧪 Testing /items?assignee_id=me endpoint...")
    
    # First login
    login_url = "http://localhost:8030/auth/login"
    login_data = {
        "username": "dev@example.com",
        "password": "password123"
    }
    
    try:
        # Login
        login_response = requests.post(login_url, data=login_data)
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.text}")
            return
        
        token = login_response.json()['access_token']
        print("✅ Login successful")
        
        # Test the me endpoint
        headers = {"Authorization": f"Bearer {token}"}
        me_url = "http://localhost:8030/items?assignee_id=me"
        
        response = requests.get(me_url, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            items = response.json()
            print(f"✅ Me endpoint successful! Found {len(items)} items for current user")
            for item in items:
                print(f"  - {item['title']} (assigned to user {item.get('assignee_id', 'None')})")
        else:
            print(f"❌ Me endpoint failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_me_endpoint()

