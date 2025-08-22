# Llama.cpp Monitoring Server

A HTTP server that provides detailed inference monitoring and logging capabilities for llama.cpp models. This server integrates with the llama-instrumentation system to provide real-time insights into the inference process.

## Features

- **Real-time Inference Monitoring**: Track token generation, layer processing, and performance metrics
- **Detailed Logging**: Session-based logging with unique identifiers stored in individual log files
- **RESTful API**: Clean HTTP endpoints for easy integration
- **Stream-based Responses**: Get complete inference logs after processing
- **Model Analytics**: Layer-by-layer processing information and sampling state details

## Building

From the llama.cpp root directory:

```bash
mkdir build
cd build
cmake ..
make llama-monitoring-server
```

## Usage

### Starting the Server

```bash
# From llama.cpp root directory
./build/tools/monitoring-server/llama-monitoring-server
```

The server starts on port 8080 by default and loads the Gemma-3 1B model from `downloads/gemma-3-1b-it-Q4_K_M.gguf`.

### API Endpoints

#### POST /log-monitoring
Start an inference session with detailed logging.

**Request:**
```json
{
    "prompt": "what is the roadmap i can follow to learn AI/ML and get a decent job in it?"
}
```

**Response:**
```json
{
    "session_id": "sess_fcf5c630",
    "log_file_path": "tools/monitoring-server/logs/sess_fcf5c630.log",
    "logs": "...", // Complete JSON logs
    "status": "completed"
}
```

#### GET /logs/{session_id}
Retrieve logs for a specific session.

**Response:**
```json
{
    "session_id": "sess_fcf5c630",
    "logs": "..." // Complete JSON logs
}
```

#### GET /sessions
List all active sessions.

**Response:**
```json
{
    "active_sessions": [
        {
            "session_id": "sess_fcf5c630",
            "log_file_path": "tools/monitoring-server/logs/sess_fcf5c630.log"
        }
    ]
}
```

#### GET /health
Health check endpoint.

**Response:**
```json
{
    "status": "ok",
    "model_loaded": true
}
```

## Log Format

Logs are stored as newline-delimited JSON (NDJSON) with events including:

- `session_start`: Session initialization with model info
- `step_begin/step_end`: Processing step boundaries with timing
- `sampling_state`: Detailed token sampling information with:
  - Top-K tokens and probabilities
  - Layer-by-layer processing details
  - Sampling method and parameters
- `performance_metric`: Key performance indicators
- `session_end`: Session completion

### Example Log Entry

```json
{
    "event": "sampling_state",
    "timestamp": "2025-08-22 21:23:48.556",
    "sampling": {
        "top_tokens": [108, 107, 236743],
        "top_probs": [0.999451, 0.000379, 0.000082],
        "top_token_texts": ["\\n\\n", "\\n", " "],
        "selected_token": 108,
        "selected_prob": 0.999451,
        "sampling_method": "greedy",
        "layer_details": [
            {
                "layer_id": 0,
                "layer_type": "attention",
                "operation": "multi_head_self_attention",
                "execution_time_us": 1000,
                "layer_metrics": {
                    "attention_heads": 4.0,
                    "hidden_dim": 1152.0
                }
            }
            // ... more layers
        ]
    },
    "session_id": "sess_fcf5c630"
}
```

## Integration

The monitoring server can be integrated into larger workflows:

1. **Development**: Use for understanding model behavior during development
2. **Debugging**: Analyze problematic generations with detailed logs  
3. **Performance Analysis**: Track layer-by-layer execution times
4. **Research**: Study attention patterns and sampling behavior

## File Structure

```
tools/monitoring-server/
├── monitoring-server.cpp   # Main server implementation
├── CMakeLists.txt          # Build configuration
├── README.md              # This file
└── logs/                  # Session log files (created automatically)
    ├── sess_abcd1234.log
    └── sess_efgh5678.log
```

## Dependencies

- llama.cpp core libraries
- llama-instrumentation system
- cpp-httplib (HTTP server)
- nlohmann/json (JSON processing)
- Same model file as test_inference_instrumentation.cpp

## Configuration

The server is configured to use:
- **Model**: `downloads/gemma-3-1b-it-Q4_K_M.gguf`
- **Port**: 8080
- **Context Length**: 512 tokens
- **Batch Size**: 32
- **CPU Threads**: 4
- **Generation Limit**: 20 tokens per request (for faster responses)

## Notes

- Log files persist across server restarts
- Each session generates a unique log file
- The server loads the model once at startup
- CORS is enabled for web-based integrations
