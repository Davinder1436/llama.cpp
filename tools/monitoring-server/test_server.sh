#!/bin/bash

# Test script for the monitoring server

echo "🧪 Testing Llama.cpp Monitoring Server..."

# Start the server in background
cd /Users/dave/Work/AI/llama.cpp
./build/bin/llama-monitoring-server &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test health endpoint
echo "🔍 Testing health endpoint..."
curl -s http://localhost:8080/health | jq '.'

# Test the main monitoring endpoint
echo "🚀 Testing inference endpoint..."
curl -s -X POST http://localhost:8080/log-monitoring \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello, how are you?"}' | jq '.session_id, .status, (.logs | length)'

# Test sessions endpoint
echo "📋 Testing sessions list..."
curl -s http://localhost:8080/sessions | jq '.active_sessions | length'

# Clean up
kill $SERVER_PID

echo "✅ Test completed!"
