#!/usr/bin/env python3
"""
Simple test script for the llama-monitoring-server
"""

import requests
import json
import time
import subprocess
import sys
import os
import signal

def test_monitoring_server():
    print("🧪 Testing Llama.cpp Monitoring Server...")
    
    # Change to the correct directory
    os.chdir("/Users/dave/Work/AI/llama.cpp")
    
    # Start the server in background
    print("🚀 Starting monitoring server...")
    server_process = subprocess.Popen(
        ["./build/bin/llama-monitoring-server"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for server to start
    print("⏳ Waiting for server to initialize...")
    time.sleep(10)
    
    try:
        base_url = "http://localhost:8080"
        
        # Test health endpoint
        print("🔍 Testing health endpoint...")
        try:
            response = requests.get(f"{base_url}/health", timeout=5)
            if response.status_code == 200:
                health_data = response.json()
                print(f"✅ Health check: {health_data}")
            else:
                print(f"❌ Health check failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Health check error: {e}")
        
        # Test the main monitoring endpoint
        print("🚀 Testing inference endpoint...")
        try:
            payload = {"prompt": "Hello, how are you?"}
            response = requests.post(
                f"{base_url}/log-monitoring",
                json=payload,
                timeout=30
            )
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Inference test:")
                print(f"   Session ID: {result.get('session_id', 'N/A')}")
                print(f"   Status: {result.get('status', 'N/A')}")
                print(f"   Logs length: {len(result.get('logs', ''))}")
            else:
                print(f"❌ Inference test failed: {response.status_code}")
                print(f"Response: {response.text}")
        except Exception as e:
            print(f"❌ Inference test error: {e}")
        
        # Test sessions endpoint
        print("📋 Testing sessions list...")
        try:
            response = requests.get(f"{base_url}/sessions", timeout=5)
            if response.status_code == 200:
                sessions_data = response.json()
                print(f"✅ Sessions: {len(sessions_data.get('active_sessions', []))} active sessions")
            else:
                print(f"❌ Sessions test failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Sessions test error: {e}")
            
    finally:
        # Clean up
        print("🧹 Shutting down server...")
        server_process.terminate()
        time.sleep(2)
        if server_process.poll() is None:
            server_process.kill()
        
        print("✅ Test completed!")

if __name__ == "__main__":
    test_monitoring_server()
