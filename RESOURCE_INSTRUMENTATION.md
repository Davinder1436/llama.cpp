# LLaMA Resource Instrumentation System

## Overview

The LLaMA Resource Instrumentation System provides comprehensive monitoring of GPU memory usage, compute utilization, and component flows during transformer model inference. This system tracks resource consumption at multiple levels of granularity, from individual tensor operations to layer-wide resource patterns.

## Features

- **Memory Tracking**: Real-time monitoring of tensor allocations, VRAM usage, and memory bandwidth
- **Compute Monitoring**: GFLOPS estimation, operation duration tracking, and SM utilization analysis  
- **Component Flow Analysis**: Inter-component data transfers and memory pressure monitoring
- **KV Cache Optimization**: Cache hit ratios, size tracking, and sequence management
- **MLP Resource Analysis**: Memory-intensive MLP operation monitoring with activation function profiling
- **Multi-Level Logging**: MINIMAL, DETAILED, and VERBOSE instrumentation levels
- **JSON Output**: Structured logging for integration with monitoring dashboards

## Architecture

### Core Components

1. **llama_resource_instrumentation**: Main instrumentation class
2. **Resource Data Structures**: Specialized tracking for different resource types
3. **Estimation Algorithms**: Predictive models for resource usage
4. **JSON Serialization**: Structured output for analysis tools

### Resource Types

- `llama_memory_resource`: Memory allocations and bandwidth
- `llama_compute_resource`: Compute operations and performance
- `llama_component_flow`: Data transfers between components
- `llama_kv_cache_resource`: KV cache operations and efficiency
- `llama_mlp_resource`: MLP-specific resource consumption

## Quick Start

### 1. Initialization

```cpp
#include "llama-resource-instrumentation.h"

// Initialize with DETAILED logging
llama_resource_instrumentation_init(
    llama_resource_level::DETAILED, 
    "logs/resource_instrumentation.jsonl"
);
```

### 2. Session Management

```cpp
// Begin tracking session
LLAMA_RESOURCE_BEGIN_SESSION("inference_sess_20240101_143022_123456");

// Your inference code here...

// End session with summary
LLAMA_RESOURCE_END_SESSION();
```

### 3. Layer-Level Tracking

```cpp
for (int layer_id = 0; layer_id < n_layers; ++layer_id) {
    LLAMA_RESOURCE_BEGIN_LAYER(layer_id);
    
    // Attention operations
    LLAMA_RESOURCE_BEGIN_COMPONENT("attention");
    LLAMA_RESOURCE_LOG_COMPUTE_OPERATION("mul_mat", "qkv_proj", {input}, qkv_output);
    LLAMA_RESOURCE_END_COMPONENT("attention");
    
    // MLP operations  
    LLAMA_RESOURCE_BEGIN_COMPONENT("mlp");
    LLAMA_RESOURCE_LOG_MLP_OPERATION("gate_proj", gate_weights, gate_activations);
    LLAMA_RESOURCE_LOG_MLP_OPERATION("up_proj", up_weights, up_activations);
    LLAMA_RESOURCE_LOG_MLP_OPERATION("down_proj", down_weights, down_activations);
    LLAMA_RESOURCE_END_COMPONENT("mlp");
    
    LLAMA_RESOURCE_END_LAYER(layer_id);
}
```

### 4. Memory and Compute Tracking

```cpp
// Memory allocation tracking
LLAMA_RESOURCE_LOG_MEMORY_ALLOCATION(weight_tensor, "qkv_weights");
LLAMA_RESOURCE_LOG_MEMORY_ALLOCATION(activation_tensor, "attention_output");

// Compute operation tracking
std::vector<const ggml_tensor*> inputs = {query, key, value};
LLAMA_RESOURCE_LOG_COMPUTE_OPERATION("attention", "multi_head_attention", inputs, attention_output);

// Component data flow
LLAMA_RESOURCE_LOG_COMPONENT_HANDOFF("attention", "mlp");
```

## Instrumentation Levels

### MINIMAL
- Only tracks major operations (matrix multiplications, large allocations)
- Minimal overhead, suitable for production inference
- Memory threshold: >1MB allocations only

### DETAILED  
- Tracks all significant operations including activations and layer norms
- Balanced view of resource usage patterns
- Recommended for performance analysis

### VERBOSE
- Comprehensive tracking including element-wise operations
- Maximum detail for debugging and optimization
- Higher overhead, recommended for development only

## Output Format

All events are logged as JSON objects with consistent structure:

### Memory Allocation Event
```json
{
  "event": "memory_allocation",
  "resource_id": "gpu_0_memory_layer_12_qkv_weights_1704097842123456",
  "timestamp": "1704097842123456",
  "component_type": "qkv_weights", 
  "layer_id": 12,
  "allocation_size_mb": 256.5,
  "memory_type": "vram",
  "tensor_shape": [4096, 12288],
  "precision": "f16",
  "estimated_bandwidth_gbps": 450.2,
  "compression_ratio": 2.0,
  "memory_address": "0x7f8b40000000"
}
```

### Compute Operation Event
```json
{
  "event": "compute_execution",
  "resource_id": "gpu_0_compute_layer_12_attention_1704097842234567",
  "timestamp": "1704097842234567",
  "operation": "mul_mat",
  "component_type": "attention",
  "layer_id": 12,
  "input_tensors": ["query", "key_cache"],
  "output_shape": [1, 128, 4096],
  "compute_intensity_gflops": 45.3,
  "estimated_duration_us": 1250,
  "parallelism_factor": 32,
  "memory_throughput_gbps": 580.4,
  "sm_utilization_percent": 87.5
}
```

### MLP Resource Event
```json
{
  "event": "mlp_operation", 
  "resource_id": "gpu_0_mlp_layer_12_gate_proj_1704097842345678",
  "timestamp": "1704097842345678",
  "mlp_operation": "gate_proj",
  "layer_id": 12,
  "weight_shape": [4096, 11008],
  "activation_shape": [1, 128, 11008],
  "intermediate_size_mb": 84.2,
  "activation_memory_peak_mb": 168.4,
  "activation_function": "silu"
}
```

### Component Flow Event  
```json
{
  "event": "component_handoff",
  "resource_id": "gpu_0_flow_layer_12_attention_to_mlp_1704097842456789", 
  "timestamp": "1704097842456789",
  "from_component": "attention",
  "to_component": "mlp",
  "layer_id": 12,
  "data_size_mb": 2.0,
  "transfer_bandwidth_gbps": 500.0,
  "memory_pressure": "medium"
}
```

### Session Events
```json
{
  "event": "resource_session_start",
  "timestamp": "2024-01-01 14:30:22.123",
  "session_id": "resource_sess_20240101_143022_123456", 
  "level": "DETAILED"
}

{
  "event": "resource_session_summary",
  "timestamp": "2024-01-01 14:30:45.789",
  "session_id": "resource_sess_20240101_143022_123456",
  "total_memory_mb": 8192.5,
  "total_compute_gflops": 1250.3,
  "component_flows": 96
}
```

## Integration with Existing Systems

### With llama-instrumentation.cpp
The resource instrumentation works alongside the existing token-level instrumentation:

```cpp
// Token-level monitoring continues to work
LLAMA_LOG_INFO("Token generation: %s", token.c_str());

// Add resource-level monitoring  
LLAMA_RESOURCE_LOG_COMPUTE_OPERATION("softmax", "attention", inputs, output);
```

### With monitoring-server.cpp
Resource logs can be streamed through the existing HTTP endpoints:

```cpp
// Add resource log streaming endpoint
if (path == "/api/v1/resource-logs") {
    return serve_resource_logs(req);
}
```

## Configuration

### Environment Variables
- `LLAMA_RESOURCE_LOG_LEVEL`: Set instrumentation level (MINIMAL/DETAILED/VERBOSE)
- `LLAMA_RESOURCE_LOG_PATH`: Custom log file path
- `LLAMA_RESOURCE_DISABLED`: Disable all resource tracking

### Runtime Control
```cpp
// Change level during runtime
g_resource_instr->set_level(llama_resource_level::VERBOSE);

// Temporarily disable
g_resource_instr->disable();

// Flush logs immediately  
g_resource_instr->flush();
```

## Performance Impact

| Level | Memory Overhead | CPU Overhead | Disk I/O |
|-------|----------------|--------------|----------|
| MINIMAL | <1% | <0.5% | ~10KB/s |
| DETAILED | 2-3% | 1-2% | ~50KB/s |
| VERBOSE | 5-8% | 3-5% | ~200KB/s |

## Analysis Tools

### Log Processing
```bash
# Extract memory usage patterns
cat resource_logs.jsonl | jq 'select(.event=="memory_allocation") | {layer_id, allocation_size_mb, memory_type}'

# Compute intensity by layer
cat resource_logs.jsonl | jq 'select(.event=="compute_execution") | {layer_id, compute_intensity_gflops}' | sort_by(.layer_id)

# MLP memory peaks  
cat resource_logs.jsonl | jq 'select(.event=="mlp_operation") | {layer_id, mlp_operation, activation_memory_peak_mb}'
```

### Dashboard Integration
The JSON output format is designed for easy integration with monitoring dashboards like Grafana, Datadog, or custom visualization tools.

## Troubleshooting

### High Memory Usage
```cpp
// Check for memory leaks in resource tracking
LLAMA_RESOURCE_BEGIN_SESSION("debug_session");
// ... run inference ...
LLAMA_RESOURCE_END_SESSION();
// Check session summary for anomalous memory usage
```

### Performance Impact
```cpp
// Profile with minimal instrumentation first
llama_resource_instrumentation_init(llama_resource_level::MINIMAL, "minimal.jsonl");

// Compare against detailed logging
llama_resource_instrumentation_init(llama_resource_level::DETAILED, "detailed.jsonl");
```

### Missing Events
- Ensure `llama_resource_instrumentation_init()` is called before inference
- Check that log file has write permissions
- Verify session management with `BEGIN_SESSION`/`END_SESSION` 

## Future Extensions

- **Multi-GPU Tracking**: Resource usage across multiple devices
- **Memory Pressure Prediction**: Proactive memory management
- **Real-time Optimization**: Dynamic resource allocation based on patterns
- **Integration with CUDA Profilers**: Direct NVML integration for hardware metrics

## Contributing

When adding new resource tracking:

1. Define the resource structure in the header file
2. Implement JSON serialization for the new event type  
3. Add logging macros for convenient usage
4. Update this documentation with examples
5. Add appropriate estimation algorithms for the new resource type

## License

This instrumentation system follows the same license as the parent llama.cpp project.
