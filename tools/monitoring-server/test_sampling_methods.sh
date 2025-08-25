#!/bin/bash

# Test script for monitoring server with different sampling methods
# This script demonstrates the new sampling functionality

SERVER_URL="http://localhost:8080"
TEST_PROMPT="Explain the concept of artificial intelligence"

echo "🧪 Testing Monitoring Server with Different Sampling Methods"
echo "============================================================"

# Function to test a specific sampling method
test_sampling_method() {
    local method=$1
    local params=$2
    local name=$3
    
    echo ""
    echo "🎯 Testing $name..."
    echo "Method: $method"
    echo "Parameters: $params"
    echo ""
    
    # Create the JSON payload
    local json_payload
    if [ -z "$params" ]; then
        json_payload=$(cat <<EOF
{
  "prompt": "$TEST_PROMPT",
  "sampling": {
    "method": "$method"
  }
}
EOF
)
    else
        json_payload=$(cat <<EOF
{
  "prompt": "$TEST_PROMPT",
  "sampling": {
    "method": "$method",
    $params
  }
}
EOF
)
    fi
    
    echo "📤 Sending request..."
    echo "$json_payload" | jq '.'
    
    # Send the request and capture response
    response=$(curl -s -X POST "$SERVER_URL/log-monitoring" \
        -H "Content-Type: application/json" \
        -d "$json_payload")
    
    if [ $? -eq 0 ]; then
        echo "✅ Request successful!"
        echo "📝 Response:"
        echo "$response" | jq '.session_id, .status'
        
        # Extract session_id and show a snippet of logs
        session_id=$(echo "$response" | jq -r '.session_id')
        if [ "$session_id" != "null" ]; then
            echo "🔍 Sample logs for session $session_id:"
            echo "$response" | jq -r '.logs' | head -3 | tail -1 | jq '.'
        fi
    else
        echo "❌ Request failed!"
    fi
    
    echo "----------------------------------------"
}

# Check if server is running
echo "🔍 Checking server status..."
health_check=$(curl -s "$SERVER_URL/health" 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "❌ Server is not running at $SERVER_URL"
    echo "Please start the monitoring server first:"
    echo "cd /path/to/llama.cpp"
    echo "./build/bin/llama-monitoring-server"
    exit 1
fi

echo "✅ Server is running!"
echo "$health_check" | jq '.'

# Test different sampling methods

# 1. Greedy Sampling
test_sampling_method "greedy" "" "Greedy Sampling"

# 2. Top-K Sampling  
test_sampling_method "top_k" '"top_k": 40, "temperature": 0.8' "Top-K Sampling"

# 3. Top-P Sampling
test_sampling_method "top_p" '"top_p": 0.9, "temperature": 0.7' "Top-P (Nucleus) Sampling"

# 4. Temperature Sampling
test_sampling_method "temperature" '"temperature": 1.2' "Temperature Sampling"

# 5. Advanced Top-K with custom parameters
test_sampling_method "top_k" '"top_k": 50, "temperature": 0.9, "seed": 42' "Advanced Top-K"

# 6. Advanced Top-P with custom parameters  
test_sampling_method "top_p" '"top_p": 0.95, "temperature": 0.6, "min_p": 0.02' "Advanced Top-P"

echo ""
echo "🎉 All tests completed!"
echo ""
echo "📊 To view detailed logs for any session, use:"
echo "curl http://localhost:8080/logs/{session_id}"
echo ""
echo "📈 To list all sessions:"
echo "curl http://localhost:8080/sessions"
