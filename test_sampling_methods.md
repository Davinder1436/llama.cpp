# Testing Sampling Methods with curl

## Updated Endpoint Usage

The monitoring server now supports different sampling methods through the `/generate` endpoint.

### Basic Structure

```bash
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Your prompt here",
    "max_tokens": 100,
    "sampling": {
      "method": "METHOD_NAME",
      "parameter1": value1,
      "parameter2": value2
    }
  }'
```

## Available Sampling Methods

### 1. Greedy Sampling (Default)

```bash
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The capital of France is",
    "max_tokens": 50,
    "sampling": {
      "method": "greedy"
    }
  }'
```

### 2. Top-K Sampling

```bash
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Once upon a time in a magical forest",
    "max_tokens": 100,
    "sampling": {
      "method": "top-k",
      "top_k": 40,
      "temperature": 0.8
    }
  }'
```

**Top-K with different K values:**

```bash
# Conservative (K=10)
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The future of artificial intelligence is",
    "max_tokens": 80,
    "sampling": {
      "method": "top-k",
      "top_k": 10,
      "temperature": 0.7
    }
  }'

# Creative (K=100)
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a creative story about",
    "max_tokens": 120,
    "sampling": {
      "method": "top-k",
      "top_k": 100,
      "temperature": 1.0
    }
  }'
```

### 3. Top-P (Nucleus) Sampling

```bash
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "In the year 2050, technology will",
    "max_tokens": 100,
    "sampling": {
      "method": "top-p",
      "top_p": 0.9,
      "temperature": 0.8
    }
  }'
```

**Top-P with different P values:**

```bash
# Conservative (P=0.5)
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Climate change solutions include",
    "max_tokens": 80,
    "sampling": {
      "method": "top-p",
      "top_p": 0.5,
      "temperature": 0.6
    }
  }'

# Creative (P=0.95)
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Imagine a world where",
    "max_tokens": 120,
    "sampling": {
      "method": "top-p",
      "top_p": 0.95,
      "temperature": 1.1
    }
  }'
```

### 4. Temperature Scaling

```bash
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The most important lesson in life is",
    "max_tokens": 100,
    "sampling": {
      "method": "temperature",
      "temperature": 0.8
    }
  }'
```

**Temperature with different values:**

```bash
# Conservative (T=0.3)
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The scientific method involves",
    "max_tokens": 80,
    "sampling": {
      "method": "temperature",
      "temperature": 0.3
    }
  }'

# Balanced (T=0.7)
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "My favorite hobby is",
    "max_tokens": 100,
    "sampling": {
      "method": "temperature",
      "temperature": 0.7
    }
  }'

# Creative (T=1.2)
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "In a parallel universe",
    "max_tokens": 120,
    "sampling": {
      "method": "temperature",
      "temperature": 1.2
    }
  }'
```

## Advanced Combinations

### Combined Top-K + Top-P

```bash
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The best programming language for beginners is",
    "max_tokens": 100,
    "sampling": {
      "method": "top-k",
      "top_k": 50,
      "top_p": 0.9,
      "temperature": 0.8
    }
  }'
```

### Long-form Generation

```bash
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a short essay about the impact of social media:",
    "max_tokens": 200,
    "sampling": {
      "method": "top-p",
      "top_p": 0.92,
      "temperature": 0.85,
      "repetition_penalty": 1.1
    }
  }'
```

## Testing Animation Features

The frontend now provides customized animations for different sampling methods:

1. **Greedy**: Standard green theme with simple token selection
2. **Top-K**: Purple theme with filtering animations showing eliminated tokens
3. **Temperature**: Orange theme with flowing gradients and probability shifts

To test the animations:

1. Start the monitoring server: `./llama-monitoring-server`
2. Open the frontend: `http://localhost:3000`
3. Use any of the sampling configurations above
4. Click "View Animation" to see method-specific visualizations

## Response Format

All endpoints return:

```json
{
  "response": "Generated text...",
  "session_id": "unique_session_id",
  "sampling_logs": [/* Detailed sampling information */]
}
```

## Health Check

```bash
curl http://localhost:8080/health
```

Returns:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "server_version": "1.0.0"
}
```
