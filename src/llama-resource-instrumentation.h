#pragma once

#include "llama.h"
#include "ggml.h"
#include "llama-impl.h"

#include <string>
#include <vector>
#include <chrono>
#include <memory>
#include <fstream>
#include <map>
#include <mutex>
#include <sstream>
#include <iomanip>
#include <stdexcept>

#define RESOURCE_LOG_PREFIX "[RESOURCE] "

// Instrumentation levels for controlling logging detail
enum class llama_resource_level {
    MINIMAL,     // Only major resource allocations and layer summaries
    DETAILED,    // Include component-level tracking and flow analysis
    VERBOSE      // Full resource tracking including micro-operations
};

// Forward declarations
class llama_resource_instrumentation;

// Resource identification and metadata
struct llama_resource_id {
    std::string device_id;           // "gpu_0", "cpu", etc.
    std::string resource_type;       // "memory", "compute", "cache", "flow"
    int layer_id;
    std::string component;           // "attention_qkv", "mlp_gate", "mlp_up", etc.
    uint64_t timestamp_us;
    
    std::string to_string() const {
        return device_id + "_" + resource_type + "_layer" + std::to_string(layer_id) + 
               "_" + component + "_" + std::to_string(timestamp_us);
    }
};

// Memory resource tracking
struct llama_memory_resource {
    llama_resource_id resource_id;
    size_t allocation_size_bytes;
    std::vector<int64_t> tensor_shape;
    ggml_type precision;
    std::string memory_type;         // "vram", "ram", "cache"
    double estimated_bandwidth_gbps;
    double compression_ratio;
    void* memory_address;
    std::chrono::high_resolution_clock::time_point alloc_time;
    std::string to_json() const;
};

// Compute resource tracking  
struct llama_compute_resource {
    llama_resource_id resource_id;
    std::string operation_type;      // "gemm", "softmax", "gelu", "silu"
    std::string component_type;      // "attention_qkv", "attention_scores", "mlp_gate", etc.
    std::vector<std::string> input_tensor_names;
    std::vector<int64_t> output_shape;
    double compute_intensity_gflops;
    uint64_t estimated_duration_us;
    int parallelism_factor;
    double memory_throughput_gbps;
    double sm_utilization_percent;
    std::string to_json() const;
};

// Component flow tracking (attention -> MLP -> next layer)
struct llama_component_flow {
    llama_resource_id resource_id;
    std::string from_component;      // "input", "attention", "mlp"
    std::string to_component;        // "attention", "mlp", "output"
    int layer_id;
    size_t data_size_bytes;
    double transfer_bandwidth_gbps;
    std::string memory_pressure;     // "low", "medium", "high"
    std::chrono::high_resolution_clock::time_point transfer_time;
    std::string to_json() const;
};

// KV Cache resource tracking
struct llama_kv_cache_resource {
    llama_resource_id resource_id;
    int layer_id;
    llama_seq_id seq_id;
    llama_pos cache_start_pos;
    llama_pos cache_end_pos;
    size_t key_cache_size_bytes;
    size_t value_cache_size_bytes;
    double cache_hit_ratio;
    std::string cache_operation;     // "allocate", "update", "evict"
    std::string to_json() const;
};

// MLP-specific resource tracking
struct llama_mlp_resource {
    llama_resource_id resource_id;
    std::string mlp_operation;       // "gate_proj", "up_proj", "down_proj", "activation"
    int layer_id;
    std::vector<int64_t> weight_shape;
    std::vector<int64_t> activation_shape;
    size_t intermediate_size_bytes;   // For storing activations between projections
    double activation_memory_peak_mb; // Peak memory during activation computation
    std::string activation_function;  // "silu", "gelu", "swiglu"
    std::string to_json() const;
};

// Main resource instrumentation class
class llama_resource_instrumentation {
private:
    // Configuration
    llama_resource_level level_;
    std::string log_file_path_;
    std::unique_ptr<std::ofstream> log_file_;
    bool enabled_;
    std::string session_id_;
    
    // Resource tracking state
    std::map<std::string, llama_memory_resource> active_memory_resources_;
    std::map<std::string, llama_compute_resource> active_compute_resources_;
    std::vector<llama_component_flow> component_flows_;
    std::map<int, llama_kv_cache_resource> layer_kv_caches_;
    
    // Sequential tracking
    int current_layer_id_;
    std::string current_component_;  // "attention" or "mlp"
    std::chrono::high_resolution_clock::time_point layer_start_time_;
    std::chrono::high_resolution_clock::time_point component_start_time_;
    
    // Statistics
    std::map<std::string, double> component_memory_peaks_;
    std::map<std::string, double> component_compute_totals_;
    
    // Thread safety
    std::mutex resources_mutex_;

public:
    // Constructor/Destructor
    llama_resource_instrumentation(llama_resource_level level, const std::string& log_path);
    ~llama_resource_instrumentation();
    
    // Control methods
    void enable();
    void disable(); 
    void flush();
    void set_level(llama_resource_level level);
    
    // Session management
    void begin_session(const std::string& session_id);
    void end_session();
    
    // Layer-level tracking
    void begin_layer(int layer_id);
    void end_layer(int layer_id);
    
    // Component-level tracking  
    void begin_component(const std::string& component_type); // "attention" or "mlp"
    void end_component(const std::string& component_type);
    
    // Resource logging methods (public interface)
    void log_memory_allocation(const ggml_tensor* tensor, const std::string& component_type);
    void log_memory_deallocation(const std::string& resource_id);
    void log_compute_operation(const std::string& operation, const std::string& component_type, 
                              const std::vector<const ggml_tensor*>& inputs,
                              const ggml_tensor* output);
    void log_component_handoff(const std::string& from_component, const std::string& to_component);
    void log_kv_cache_operation(int layer_id, const std::string& operation, 
                               size_t cache_size_bytes);
    void log_mlp_operation(const std::string& mlp_op, const ggml_tensor* weights, 
                          const ggml_tensor* activations);
    
private:
    // Internal helper methods
    llama_resource_id generate_resource_id(const std::string& resource_type, 
                                         const std::string& component);
    double estimate_memory_bandwidth(const ggml_tensor* tensor, const std::string& operation);
    double estimate_compute_gflops(const std::string& operation, const ggml_tensor* a, 
                                  const ggml_tensor* b = nullptr);
    uint64_t estimate_operation_duration(const std::string& operation, double gflops);
    int estimate_parallelism_factor(const ggml_tensor* tensor);
    double get_compression_ratio(const ggml_tensor* tensor);
    
    // Logging utilities
    void write_log_entry(const std::string& entry);
    std::string get_current_timestamp();
    std::string escape_json_string(const std::string& input);
    std::string generate_session_id();
};

// Global instance and initialization functions
extern std::unique_ptr<llama_resource_instrumentation> g_resource_instr;

void llama_resource_instrumentation_init(llama_resource_level level, const std::string& log_path);
void llama_resource_instrumentation_free();

// Helper macros for easy integration
#define RESOURCE_TRACK_MEMORY_ALLOC(tensor, component) \
    if (g_resource_instr) g_resource_instr->log_memory_allocation(tensor, component)

#define RESOURCE_TRACK_COMPUTE_OP(op, component, inputs, output) \
    if (g_resource_instr) g_resource_instr->log_compute_operation(op, component, inputs, output)

#define RESOURCE_TRACK_COMPONENT_BEGIN(component) \
    if (g_resource_instr) g_resource_instr->begin_component(component)

#define RESOURCE_TRACK_COMPONENT_END(component) \
    if (g_resource_instr) g_resource_instr->end_component(component)

#define RESOURCE_TRACK_LAYER_BEGIN(layer_id) \
    if (g_resource_instr) g_resource_instr->begin_layer(layer_id)

#define RESOURCE_TRACK_LAYER_END(layer_id) \
    if (g_resource_instr) g_resource_instr->end_layer(layer_id)

#define RESOURCE_TRACK_MLP_OP(mlp_op, weights, activations) \
    if (g_resource_instr) g_resource_instr->log_mlp_operation(mlp_op, weights, activations)

#define RESOURCE_TRACK_KV_CACHE(layer_id, operation, size_bytes) \
    if (g_resource_instr) g_resource_instr->log_kv_cache_operation(layer_id, operation, size_bytes)

#define RESOURCE_TRACK_HANDOFF(from_comp, to_comp) \
    if (g_resource_instr) g_resource_instr->log_component_handoff(from_comp, to_comp)
