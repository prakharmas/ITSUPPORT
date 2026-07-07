#!/usr/bin/env python3
"""
Test API endpoints
"""

import requests
import json

def test_login():
    """Test login endpoint"""
    print("🔐 Testing login...")
    
    url = "http://localhost:8030/auth/login"
    data = {
        "username": "pm@example.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(url, data=data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Login successful!")
            print(f"Token: {result['access_token'][:50]}...")
            return result['access_token']
        else:
            print(f"❌ Login failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_users_endpoint(token):
    """Test users endpoint with authentication"""
    print("\n👥 Testing users endpoint...")
    
    url = "http://localhost:8030/users/"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            users = response.json()
            print(f"✅ Users endpoint successful! Found {len(users)} users:")
            for user in users:
                print(f"  - {user['name']} ({user['email']}) - {user['role']}")
        else:
            print(f"❌ Users endpoint failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def test_items_endpoint(token):
    """Test items endpoint"""
    print("\n📋 Testing items endpoint...")
    
    url = "http://localhost:8030/items/"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            items = response.json()
            print(f"✅ Items endpoint successful! Found {len(items)} items")
        else:
            print(f"❌ Items endpoint failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🧪 Testing API endpoints...")
    print("=" * 40)
    
    # Test login
    token = test_login()
    
    if token:
        # Test authenticated endpoints
        test_users_endpoint(token)
        test_items_endpoint(token)
    else:
        print("\n❌ Cannot test authenticated endpoints without login token")

