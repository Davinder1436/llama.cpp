# Curl Examples for Monitoring Server with Sampling Methods

## 1. Greedy Sampling (deterministic, always picks most likely token)
```bash
curl -X POST http://localhost:8080/log-monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain machine learning in simple terms",
    "sampling": {
      "method": "greedy"
    }
  }'
```

## 2. Top-K Sampling (sample from top K most likely tokens)
```bash
curl -X POST http://localhost:8080/log-monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a creative story about artificial intelligence",
    "sampling": {
      "method": "top_k",
      "top_k": 40,
      "temperature": 0.8
    }
  }'
```

## 3. Top-P Sampling (nucleus sampling - sample from tokens with cumulative probability up to P)
```bash
curl -X POST http://localhost:8080/log-monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Describe the future of technology",
    "sampling": {
      "method": "top_p",
      "top_p": 0.9,
      "temperature": 0.7
    }
  }'
```

## 4. Temperature Sampling (scale probability distribution by temperature)
```bash
curl -X POST http://localhost:8080/log-monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Creative writing: Imagine a world where robots and humans coexist",
    "sampling": {
      "method": "temperature",
      "temperature": 1.2
    }
  }'
```

## 5. Advanced Top-K with custom parameters
```bash
curl -X POST http://localhost:8080/log-monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain quantum computing",
    "sampling": {
      "method": "top_k",
      "top_k": 50,
      "temperature": 0.9,
      "seed": 42
    }
  }'
```

## 6. Advanced Top-P with fine-tuned parameters
```bash
curl -X POST http://localhost:8080/log-monitoring \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a poem about nature",
    "sampling": {
      "method": "top_p",
      "top_p": 0.95,
      "temperature": 0.8,
      "min_p": 0.02,
      "seed": 123
    }
  }'
```

## Get logs for a session
```bash
curl http://localhost:8080/logs/{session_id}
```

## Stream logs in real-time
```bash
curl "http://localhost:8080/logs/{session_id}/stream?from_line=0"
```

## List all active sessions
```bash
curl http://localhost:8080/sessions
```

## Server health check
```bash
curl http://localhost:8080/health
```

## Parameters Explanation

### Sampling Methods
- **greedy**: Always select the most probable token (deterministic)
- **top_k**: Sample from the top K most probable tokens  
- **top_p**: Sample from tokens with cumulative probability ≤ P
- **temperature**: Apply temperature scaling to probability distribution

### Parameters
- **top_k** (1-vocab_size): Number of top tokens to consider (default: 40)
- **top_p** (0.0-1.0): Cumulative probability threshold (default: 0.9) 
- **temperature** (0.0-2.0): Temperature scaling factor (default: 1.0)
  - 0.0 = greedy (deterministic)
  - 1.0 = normal distribution
  - >1.0 = more creative/random
- **min_p** (0.0-1.0): Minimum probability threshold (default: 0.05)
- **seed** (integer): Random seed for reproducible results

### Temperature Guidelines
- **0.0**: Greedy, deterministic output
- **0.1-0.3**: Very focused, conservative
- **0.4-0.7**: Balanced, good for factual content  
- **0.8-1.0**: Creative, varied output
- **1.1-1.5**: Very creative, can be chaotic
- **>1.5**: Highly random, potentially incoherent

### Top-K Guidelines
- **1-10**: Very conservative, focused output
- **20-40**: Balanced creativity and coherence  
- **50-100**: More diverse, creative output
- **>100**: Very diverse, potentially unfocused

### Top-P Guidelines
- **0.1-0.3**: Very focused output
- **0.5-0.7**: Balanced output
- **0.8-0.9**: Creative but coherent
- **0.95-1.0**: Maximum diversity
