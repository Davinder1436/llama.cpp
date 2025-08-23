#include "llama-resource-instrumentation.h"
#include "ggml.h"

#include <algorithm>
#include <numeric>
#include <cmath>
#include <random>
#include <stdexcept>
#include <thread>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <iostream>

// Global resource instrumentation instance
std::unique_ptr<llama_resource_instrumentation> g_resource_instr = nullptr;

// ============================================================================
// JSON SERIALIZATION IMPLEMENTATIONS
// ============================================================================

std::string llama_memory_resource::to_json() const {
    auto now = std::chrono::high_resolution_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::microseconds>(now.time_since_epoch()).count();
    
    std::stringstream ss;
    ss << "{\"event\":\"memory_allocation\""
       << ",\"resource_id\":\"" << resource_id.to_string() << "\""
       << ",\"timestamp\":" << timestamp
       << ",\"component_type\":\"" << resource_id.component << "\""
       << ",\"layer_id\":" << resource_id.layer_id
       << ",\"allocation_size_mb\":" << std::fixed << std::setprecision(2) 
       << (allocation_size_bytes / (1024.0 * 1024.0))
       << ",\"memory_type\":\"" << memory_type << "\""
       << ",\"tensor_shape\":[";
    
    for (size_t i = 0; i < tensor_shape.size(); ++i) {
        ss << tensor_shape[i];
        if (i < tensor_shape.size() - 1) ss << ",";
    }
    
    ss << "],\"precision\":\"" << ggml_type_name(precision) << "\""
       << ",\"estimated_bandwidth_gbps\":" << std::fixed << std::setprecision(1) 
       << estimated_bandwidth_gbps
       << ",\"compression_ratio\":" << compression_ratio
       << ",\"memory_address\":\"" << memory_address << "\"}";
    
    return ss.str();
}

std::string llama_compute_resource::to_json() const {
    auto now = std::chrono::high_resolution_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::microseconds>(now.time_since_epoch()).count();
    
    std::stringstream ss;
    ss << "{\"event\":\"compute_execution\""
       << ",\"resource_id\":\"" << resource_id.to_string() << "\""
       << ",\"timestamp\":" << timestamp
       << ",\"operation\":\"" << operation_type << "\""
       << ",\"component_type\":\"" << component_type << "\""
       << ",\"layer_id\":" << resource_id.layer_id
       << ",\"input_tensors\":[";
    
    for (size_t i = 0; i < input_tensor_names.size(); ++i) {
        ss << "\"" << input_tensor_names[i] << "\"";
        if (i < input_tensor_names.size() - 1) ss << ",";
    }
    
    ss << "],\"output_shape\":[";
    for (size_t i = 0; i < output_shape.size(); ++i) {
        ss << output_shape[i];
        if (i < output_shape.size() - 1) ss << ",";
    }
    
    ss << "],\"compute_intensity_gflops\":" << std::fixed << std::setprecision(2) 
       << compute_intensity_gflops
       << ",\"estimated_duration_us\":" << estimated_duration_us
       << ",\"parallelism_factor\":" << parallelism_factor
       << ",\"memory_throughput_gbps\":" << std::fixed << std::setprecision(1) 
       << memory_throughput_gbps
       << ",\"sm_utilization_percent\":" << std::fixed << std::setprecision(1) 
       << sm_utilization_percent << "}";
    
    return ss.str();
}

std::string llama_component_flow::to_json() const {
    auto timestamp = std::chrono::duration_cast<std::chrono::microseconds>(transfer_time.time_since_epoch()).count();
    
    std::stringstream ss;
    ss << "{\"event\":\"component_handoff\""
       << ",\"resource_id\":\"" << resource_id.to_string() << "\""
       << ",\"timestamp\":" << timestamp
       << ",\"from_component\":\"" << from_component << "\""
       << ",\"to_component\":\"" << to_component << "\""
       << ",\"layer_id\":" << layer_id
       << ",\"data_size_mb\":" << std::fixed << std::setprecision(2) 
       << (data_size_bytes / (1024.0 * 1024.0))
       << ",\"transfer_bandwidth_gbps\":" << std::fixed << std::setprecision(1) 
       << transfer_bandwidth_gbps
       << ",\"memory_pressure\":\"" << memory_pressure << "\"}";
    
    return ss.str();
}std::string llama_kv_cache_resource::to_json() const {
    auto now = std::chrono::high_resolution_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::microseconds>(now.time_since_epoch()).count();
    
    std::stringstream ss;
    ss << "{\"event\":\"kv_cache_operation\""
       << ",\"resource_id\":\"" << resource_id.to_string() << "\""
       << ",\"timestamp\":" << timestamp
       << ",\"cache_type\":\"key_value\""
       << ",\"layer_id\":" << layer_id
       << ",\"seq_id\":" << seq_id
       << ",\"cache_start_pos\":" << cache_start_pos
       << ",\"cache_end_pos\":" << cache_end_pos
       << ",\"key_cache_size_mb\":" << std::fixed << std::setprecision(2) 
       << (key_cache_size_bytes / (1024.0 * 1024.0))
       << ",\"value_cache_size_mb\":" << std::fixed << std::setprecision(2) 
       << (value_cache_size_bytes / (1024.0 * 1024.0))
       << ",\"cache_hit_ratio\":" << cache_hit_ratio
       << ",\"cache_operation\":\"" << cache_operation << "\"}";
    
    return ss.str();
}

std::string llama_mlp_resource::to_json() const {
    auto now = std::chrono::high_resolution_clock::now();
    auto timestamp = std::chrono::duration_cast<std::chrono::microseconds>(now.time_since_epoch()).count();
    
    std::stringstream ss;
    ss << "{\"event\":\"mlp_operation\""
       << ",\"resource_id\":\"" << resource_id.to_string() << "\""
       << ",\"timestamp\":" << timestamp
       << ",\"mlp_operation\":\"" << mlp_operation << "\""
       << ",\"layer_id\":" << layer_id
       << ",\"weight_shape\":[";
    
    for (size_t i = 0; i < weight_shape.size(); ++i) {
        ss << weight_shape[i];
        if (i < weight_shape.size() - 1) ss << ",";
    }
    
    ss << "],\"activation_shape\":[";
    for (size_t i = 0; i < activation_shape.size(); ++i) {
        ss << activation_shape[i];
        if (i < activation_shape.size() - 1) ss << ",";
    }
    
    ss << "],\"intermediate_size_mb\":" << std::fixed << std::setprecision(2) 
       << (intermediate_size_bytes / (1024.0 * 1024.0))
       << ",\"activation_memory_peak_mb\":" << activation_memory_peak_mb
       << ",\"activation_function\":\"" << activation_function << "\"}";
    
    return ss.str();
}

// ============================================================================
// MAIN CLASS IMPLEMENTATION
// ============================================================================

llama_resource_instrumentation::llama_resource_instrumentation(
    llama_resource_level level, const std::string& log_path)
    : level_(level)
    , log_file_path_(log_path)
    , enabled_(true)
    , session_id_(generate_session_id())
    , current_layer_id_(-1)
    , current_component_("")
{
    try {
        log_file_ = std::make_unique<std::ofstream>(log_file_path_, std::ios::app);
        if (!log_file_->is_open()) {
            throw std::runtime_error("Failed to open resource log file: " + log_file_path_);
        }
        
        // Write initial session marker
        std::stringstream entry;
        entry << "{\"event\":\"resource_session_start\""
              << ",\"timestamp\":\"" << get_current_timestamp() << "\""
              << ",\"session_id\":\"" << session_id_ << "\""
              << ",\"level\":\"" << (level == llama_resource_level::MINIMAL ? "MINIMAL" :
                                   level == llama_resource_level::DETAILED ? "DETAILED" : "VERBOSE") 
              << "\"}";
        write_log_entry(entry.str());
        
    } catch (const std::exception& e) {
        fprintf(stderr, RESOURCE_LOG_PREFIX "Failed to initialize resource instrumentation: %s\n", e.what());
        enabled_ = false;
    }
}

llama_resource_instrumentation::~llama_resource_instrumentation() {
    if (enabled_ && log_file_ && log_file_->is_open()) {
        std::stringstream entry;
        entry << "{\"event\":\"resource_session_end\""
              << ",\"timestamp\":\"" << get_current_timestamp() << "\""
              << ",\"session_id\":\"" << session_id_ << "\"}";
        write_log_entry(entry.str());
        
        log_file_->close();
    }
}

void llama_resource_instrumentation::enable() {
    enabled_ = true;
}

void llama_resource_instrumentation::disable() {
    enabled_ = false;
}

void llama_resource_instrumentation::flush() {
    if (log_file_ && log_file_->is_open()) {
        log_file_->flush();
    }
}

void llama_resource_instrumentation::set_level(llama_resource_level level) {
    level_ = level;
}

// ============================================================================
// SESSION AND LAYER MANAGEMENT
// ============================================================================

void llama_resource_instrumentation::begin_session(const std::string& session_id) {
    if (!enabled_) return;
    
    session_id_ = session_id;
    
    std::stringstream entry;
    entry << "{\"event\":\"resource_tracking_begin\""
          << ",\"timestamp\":\"" << get_current_timestamp() << "\""
          << ",\"session_id\":\"" << session_id_ << "\"}";
    write_log_entry(entry.str());
}

void llama_resource_instrumentation::end_session() {
    if (!enabled_) return;
    
    // Calculate session resource summary
    double total_memory_mb = 0.0;
    double total_compute_gflops = 0.0;
    
    {
        std::lock_guard<std::mutex> lock(resources_mutex_);
        for (const auto& [id, resource] : active_memory_resources_) {
            total_memory_mb += resource.allocation_size_bytes / (1024.0 * 1024.0);
        }
        
        for (const auto& [id, resource] : active_compute_resources_) {
            total_compute_gflops += resource.compute_intensity_gflops;
        }
    }
    
    std::stringstream entry;
    entry << "{\"event\":\"resource_session_summary\""
          << ",\"timestamp\":\"" << get_current_timestamp() << "\""
          << ",\"session_id\":\"" << session_id_ << "\""
          << ",\"total_memory_mb\":" << std::fixed << std::setprecision(2) << total_memory_mb
          << ",\"total_compute_gflops\":" << std::fixed << std::setprecision(2) << total_compute_gflops
          << ",\"component_flows\":" << component_flows_.size()
          << "}";
    write_log_entry(entry.str());
}

void llama_resource_instrumentation::begin_layer(int layer_id) {
    if (!enabled_) return;
    
    current_layer_id_ = layer_id;
    layer_start_time_ = std::chrono::high_resolution_clock::now();
    
    std::stringstream entry;
    entry << "{\"event\":\"layer_begin\""
          << ",\"timestamp\":\"" << get_current_timestamp() << "\""
          << ",\"layer_id\":" << layer_id 
          << ",\"session_id\":\"" << session_id_ << "\"}";
    write_log_entry(entry.str());
}

void llama_resource_instrumentation::end_layer(int layer_id) {
    if (!enabled_ || current_layer_id_ != layer_id) return;
    
    auto end_time = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end_time - layer_start_time_);
    
    // Calculate layer resource summary
    double layer_memory_mb = 0.0;
    double layer_compute_gflops = 0.0;
    int memory_ops = 0;
    int compute_ops = 0;
    
    {
        std::lock_guard<std::mutex> lock(resources_mutex_);
        for (const auto& [id, resource] : active_memory_resources_) {
            if (resource.resource_id.layer_id == layer_id) {
                layer_memory_mb += resource.allocation_size_bytes / (1024.0 * 1024.0);
                memory_ops++;
            }
        }
        
        for (const auto& [id, resource] : active_compute_resources_) {
            if (resource.resource_id.layer_id == layer_id) {
                layer_compute_gflops += resource.compute_intensity_gflops;
                compute_ops++;
            }
        }
    }
    
    std::stringstream entry;
    entry << "{\"event\":\"layer_end\""
          << ",\"timestamp\":\"" << get_current_timestamp() << "\""
          << ",\"layer_id\":" << layer_id 
          << ",\"duration_us\":" << duration.count()
          << ",\"layer_memory_mb\":" << std::fixed << std::setprecision(2) << layer_memory_mb
          << ",\"layer_compute_gflops\":" << std::fixed << std::setprecision(2) << layer_compute_gflops
          << ",\"memory_operations\":" << memory_ops
          << ",\"compute_operations\":" << compute_ops
          << ",\"session_id\":\"" << session_id_ << "\"}";
    write_log_entry(entry.str());
}

void llama_resource_instrumentation::begin_component(const std::string& component_type) {
    if (!enabled_) return;
    
    current_component_ = component_type;
    component_start_time_ = std::chrono::high_resolution_clock::now();
    
    std::stringstream entry;
    entry << "{\"event\":\"component_begin\""
          << ",\"timestamp\":\"" << get_current_timestamp() << "\""
          << ",\"component_type\":\"" << component_type << "\""
          << ",\"layer_id\":" << current_layer_id_
          << ",\"session_id\":\"" << session_id_ << "\"}";
    write_log_entry(entry.str());
}

void llama_resource_instrumentation::end_component(const std::string& component_type) {
    if (!enabled_ || current_component_ != component_type) return;
    
    auto end_time = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end_time - component_start_time_);
    
    std::stringstream entry;
    entry << "{\"event\":\"component_end\""
          << ",\"timestamp\":\"" << get_current_timestamp() << "\""
          << ",\"component_type\":\"" << component_type << "\""
          << ",\"layer_id\":" << current_layer_id_
          << ",\"duration_us\":" << duration.count()
          << ",\"session_id\":\"" << session_id_ << "\"}";
    write_log_entry(entry.str());
    
    current_component_.clear();
}

// ============================================================================
// RESOURCE TRACKING IMPLEMENTATIONS
// ============================================================================

void llama_resource_instrumentation::log_memory_allocation(
    const ggml_tensor* tensor, const std::string& component_type) {
    if (!enabled_ || !tensor) return;
    
    // Skip minimal logging for small tensors if level is MINIMAL
    if (level_ == llama_resource_level::MINIMAL && ggml_nbytes(tensor) < 1024 * 1024) {
        return;
    }
    
    std::lock_guard<std::mutex> lock(resources_mutex_);
    
    llama_memory_resource resource;
    resource.resource_id = generate_resource_id("memory", component_type);
    resource.allocation_size_bytes = ggml_nbytes(tensor);
    resource.precision = tensor->type;
    resource.estimated_bandwidth_gbps = estimate_memory_bandwidth(tensor, "allocation");
    resource.compression_ratio = get_compression_ratio(tensor);
    resource.memory_address = tensor->data;
    resource.alloc_time = std::chrono::high_resolution_clock::now();
    
    // Extract tensor shape
    for (int i = 0; i < ggml_n_dims(tensor); i++) {
        resource.tensor_shape.push_back(tensor->ne[i]);
    }
    
    // Determine memory type based on component
    if (component_type.find("weight") != std::string::npos || 
        component_type.find("qkv") != std::string::npos ||
        component_type.find("mlp") != std::string::npos) {
        resource.memory_type = "vram";
    } else if (component_type.find("cache") != std::string::npos) {
        resource.memory_type = "cache";
    } else {
        resource.memory_type = "activation";
    }
    
    std::string resource_key = resource.resource_id.to_string();
    active_memory_resources_[resource_key] = resource;
    write_log_entry(resource.to_json());
}

void llama_resource_instrumentation::log_compute_operation(
    const std::string& operation, const std::string& component_type,
    const std::vector<const ggml_tensor*>& inputs, const ggml_tensor* output) {
    if (!enabled_ || inputs.empty()) return;
    
    // Skip verbose operations if level is not VERBOSE
    if (level_ != llama_resource_level::VERBOSE && 
        (operation == "add" || operation == "norm" || operation == "copy")) {
        return;
    }
    
    std::lock_guard<std::mutex> lock(resources_mutex_);
    
    llama_compute_resource resource;
    resource.resource_id = generate_resource_id("compute", component_type);
    resource.operation_type = operation;
    resource.component_type = component_type;
    
    // Analyze input tensors
    for (const auto* input : inputs) {
        if (input && input->name) {
            resource.input_tensor_names.push_back(std::string(input->name));
        } else {
            resource.input_tensor_names.push_back("unnamed_tensor");
        }
    }
    
    // Output tensor information
    if (output) {
        for (int i = 0; i < ggml_n_dims(output); i++) {
            resource.output_shape.push_back(output->ne[i]);
        }
    }
    
    // Compute resource estimates
    const ggml_tensor* primary_input = inputs[0];
    const ggml_tensor* secondary_input = inputs.size() > 1 ? inputs[1] : nullptr;
    
    resource.compute_intensity_gflops = estimate_compute_gflops(operation, primary_input, secondary_input);
    resource.estimated_duration_us = estimate_operation_duration(operation, resource.compute_intensity_gflops);
    resource.parallelism_factor = estimate_parallelism_factor(primary_input);
    resource.memory_throughput_gbps = estimate_memory_bandwidth(primary_input, operation);
    
    // Estimate SM utilization based on operation and tensor size
    size_t total_elements = ggml_nelements(primary_input);
    double base_utilization = 0.0;
    
    if (operation.find("mul_mat") != std::string::npos || operation == "gemm") {
        base_utilization = 85.0;  // Matrix ops usually have high utilization
    } else if (operation == "softmax" || operation.find("norm") != std::string::npos) {
        base_utilization = 60.0;  // Memory-bound operations
    } else if (operation.find("gelu") != std::string::npos || operation.find("silu") != std::string::npos) {
        base_utilization = 70.0;  // Activation functions
    } else {
        base_utilization = 50.0;  // Default
    }
    
    // Scale by tensor size (larger tensors usually achieve higher utilization)
    double size_factor = std::min(1.2, total_elements / 1000000.0);
    resource.sm_utilization_percent = std::min(95.0, base_utilization * size_factor);
    
    std::string resource_key = resource.resource_id.to_string();
    active_compute_resources_[resource_key] = resource;
    write_log_entry(resource.to_json());
}

void llama_resource_instrumentation::log_mlp_operation(
    const std::string& mlp_op, const ggml_tensor* weights, const ggml_tensor* activations) {
    if (!enabled_ || !weights) return;
    
    llama_mlp_resource resource;
    resource.resource_id = generate_resource_id("mlp", mlp_op);
    resource.mlp_operation = mlp_op;
    resource.layer_id = current_layer_id_;
    
    // Weight tensor shape
    for (int i = 0; i < ggml_n_dims(weights); i++) {
        resource.weight_shape.push_back(weights->ne[i]);
    }
    
    // Activation tensor shape (if provided)
    if (activations) {
        for (int i = 0; i < ggml_n_dims(activations); i++) {
            resource.activation_shape.push_back(activations->ne[i]);
        }
        resource.intermediate_size_bytes = ggml_nbytes(activations);
    }
    
    // Estimate peak memory for MLP operations
    size_t weight_bytes = ggml_nbytes(weights);
    size_t activation_bytes = activations ? ggml_nbytes(activations) : 0;
    
    if (mlp_op == "gate_proj" || mlp_op == "up_proj") {
        // These create intermediate activations that need to be stored
        resource.activation_memory_peak_mb = (weight_bytes + activation_bytes * 2) / (1024.0 * 1024.0);
    } else if (mlp_op == "down_proj") {
        // This reduces dimensionality, less memory needed
        resource.activation_memory_peak_mb = (weight_bytes + activation_bytes) / (1024.0 * 1024.0);
    } else {
        resource.activation_memory_peak_mb = weight_bytes / (1024.0 * 1024.0);
    }
    
    // Determine activation function based on operation
    if (mlp_op == "gate_proj") {
        resource.activation_function = "silu";  // SwiGLU uses SiLU for gate
    } else if (mlp_op.find("gelu") != std::string::npos) {
        resource.activation_function = "gelu";
    } else if (mlp_op == "up_proj") {
        resource.activation_function = "linear";  // Up projection is usually linear
    } else {
        resource.activation_function = "linear";
    }
    
    write_log_entry(resource.to_json());
}

void llama_resource_instrumentation::log_component_handoff(
    const std::string& from_component, const std::string& to_component) {
    if (!enabled_) return;
    
    llama_component_flow flow;
    flow.resource_id = generate_resource_id("flow", from_component + "_to_" + to_component);
    flow.from_component = from_component;
    flow.to_component = to_component;
    flow.layer_id = current_layer_id_;
    flow.transfer_time = std::chrono::high_resolution_clock::now();
    
    // Estimate data size based on typical transformer dimensions
    // This is a heuristic - in practice you'd track actual tensor sizes
    if (from_component == "attention" && to_component == "mlp") {
        flow.data_size_bytes = 4096 * sizeof(float);  // Hidden dimension * sizeof(float)
        flow.transfer_bandwidth_gbps = 500.0;  // Internal GPU bandwidth
        flow.memory_pressure = "medium";
    } else if (from_component == "mlp" && to_component == "attention") {
        flow.data_size_bytes = 4096 * sizeof(float);
        flow.transfer_bandwidth_gbps = 500.0;
        flow.memory_pressure = "low";
    } else if (from_component == "input" && to_component == "attention") {
        flow.data_size_bytes = 2048 * sizeof(float);  // Sequence length * hidden size
        flow.transfer_bandwidth_gbps = 400.0;
        flow.memory_pressure = "low";
    } else {
        flow.data_size_bytes = 1024 * sizeof(float);  // Smaller default
        flow.transfer_bandwidth_gbps = 300.0;
        flow.memory_pressure = "low";
    }
    
    component_flows_.push_back(flow);
    write_log_entry(flow.to_json());
}

void llama_resource_instrumentation::log_kv_cache_operation(
    int layer_id, const std::string& operation, size_t cache_size_bytes) {
    if (!enabled_) return;
    
    llama_kv_cache_resource resource;
    resource.resource_id = generate_resource_id("cache", "kv_layer_" + std::to_string(layer_id));
    resource.layer_id = layer_id;
    resource.seq_id = 0;  // Default sequence ID
    resource.cache_start_pos = 0;
    resource.cache_end_pos = 128;  // Estimate based on typical sequence lengths
    
    // Assume roughly equal split between key and value cache
    resource.key_cache_size_bytes = cache_size_bytes / 2;
    resource.value_cache_size_bytes = cache_size_bytes / 2;
    
    resource.cache_hit_ratio = 0.85;  // Heuristic - most cache accesses are hits
    resource.cache_operation = operation;
    
    layer_kv_caches_[layer_id] = resource;
    write_log_entry(resource.to_json());
}

// ============================================================================
// ESTIMATION ALGORITHMS
// ============================================================================

double llama_resource_instrumentation::estimate_memory_bandwidth(
    const ggml_tensor* tensor, const std::string& operation) {
    if (!tensor) return 0.0;
    
    size_t tensor_bytes = ggml_nbytes(tensor);
    double base_bandwidth = 0.0;
    
    // Different operations have different memory access patterns
    if (operation == "matrix_load" || operation == "weight_load" || operation == "allocation") {
        base_bandwidth = 400.0;  // GPU memory bandwidth (GB/s) for weight loading
    } else if (operation.find("mul_mat") != std::string::npos || operation == "gemm") {
        base_bandwidth = 600.0;  // Higher bandwidth for compute-intensive ops
    } else if (operation.find("gelu") != std::string::npos || operation.find("silu") != std::string::npos) {
        base_bandwidth = 300.0;  // Activation functions are memory-bound
    } else if (operation.find("cache") != std::string::npos) {
        base_bandwidth = 800.0;  // Cache access is typically faster
    } else if (operation == "softmax" || operation.find("norm") != std::string::npos) {
        base_bandwidth = 350.0;  // Memory-intensive operations
    } else {
        base_bandwidth = 450.0;  // Default bandwidth
    }
    
    // Scale by tensor size and quantization
    double compression_factor = get_compression_ratio(tensor);
    double size_factor = std::min(1.0, std::max(0.5, tensor_bytes / (100.0 * 1024.0 * 1024.0))); // 100MB scaling
    
    return base_bandwidth * compression_factor * size_factor;
}

double llama_resource_instrumentation::estimate_compute_gflops(
    const std::string& operation, const ggml_tensor* a, const ggml_tensor* b) {
    if (!a) return 0.0;
    
    size_t elements_a = ggml_nelements(a);
    
    if ((operation.find("mul_mat") != std::string::npos || operation == "gemm") && b) {
        // GEMM: 2 * M * N * K operations
        int64_t m = a->ne[0];
        int64_t k = a->ne[1];
        int64_t n = b ? b->ne[1] : k;
        return (2.0 * m * n * k) / 1e9;
    } else if (operation == "softmax") {
        // Softmax: ~3 ops per element (exp + sum + divide)
        return (3.0 * elements_a) / 1e9;
    } else if (operation.find("silu") != std::string::npos) {
        // SiLU: x * sigmoid(x) = x / (1 + exp(-x)) ~5 ops per element
        return (5.0 * elements_a) / 1e9;
    } else if (operation.find("gelu") != std::string::npos) {
        // GELU: 0.5 * x * (1 + tanh(...)) ~8 ops per element
        return (8.0 * elements_a) / 1e9;
    } else if (operation.find("norm") != std::string::npos) {
        // Layer norm: ~5 ops per element (mean, var, norm)
        return (5.0 * elements_a) / 1e9;
    } else if (operation == "add") {
        // Element-wise addition: 1 op per element
        return elements_a / 1e9;
    } else if (operation == "mul") {
        // Element-wise multiplication: 1 op per element
        return elements_a / 1e9;
    }
    
    return 0.0;
}

uint64_t llama_resource_instrumentation::estimate_operation_duration(
    const std::string& operation, double gflops) {
    // Assume GPU compute capability (TFLOPS)
    double gpu_tflops = 150.0;  // Example: H100 has ~165 TFLOPS for mixed precision
    double efficiency = 0.7;    // Realistic efficiency factor
    
    // Base duration in microseconds
    uint64_t base_duration_us = static_cast<uint64_t>((gflops * 1000.0) / (gpu_tflops * efficiency));
    
    // Add operation-specific overhead
    uint64_t overhead_us = 0;
    if (operation.find("mul_mat") != std::string::npos || operation == "gemm") {
        overhead_us = 50;  // Matrix operations have setup overhead
    } else if (operation.find("cache") != std::string::npos) {
        overhead_us = 20;  // Cache operations are faster
    } else if (operation == "softmax" || operation.find("norm") != std::string::npos) {
        overhead_us = 30;  // Memory-bound operations
    } else if (operation.find("gelu") != std::string::npos || operation.find("silu") != std::string::npos) {
        overhead_us = 25;  // Activation function overhead
    } else {
        overhead_us = 35;  // Default overhead
    }
    
    return std::max(static_cast<uint64_t>(10), base_duration_us + overhead_us);  // Minimum 10μs
}

int llama_resource_instrumentation::estimate_parallelism_factor(const ggml_tensor* tensor) {
    if (!tensor) return 1;
    
    size_t total_elements = ggml_nelements(tensor);
    
    // Estimate parallelism based on tensor size and dimensions
    if (total_elements > 10000000) {        // > 10M elements
        return 64;  // High parallelism for large tensors
    } else if (total_elements > 1000000) {  // > 1M elements  
        return 32;  // Medium parallelism
    } else if (total_elements > 100000) {   // > 100K elements
        return 16;  // Lower parallelism
    } else if (total_elements > 10000) {    // > 10K elements
        return 8;   // Minimal parallelism
    } else {
        return 4;   // Sequential-like processing
    }
}

double llama_resource_instrumentation::get_compression_ratio(const ggml_tensor* tensor) {
    if (!tensor) return 1.0;
    
    switch (tensor->type) {
        case GGML_TYPE_F32: return 1.0;      // No compression
        case GGML_TYPE_F16: return 2.0;      // 2x compression
        case GGML_TYPE_Q8_0: return 4.0;     // ~4x compression
        case GGML_TYPE_Q4_0: 
        case GGML_TYPE_Q4_1: return 8.0;     // ~8x compression
        case GGML_TYPE_Q2_K: return 16.0;    // ~16x compression
        default: return 4.0;                 // Default assumption
    }
}

// ============================================================================
// UTILITY METHODS
// ============================================================================

llama_resource_id llama_resource_instrumentation::generate_resource_id(
    const std::string& resource_type, const std::string& component) {
    llama_resource_id id;
    id.device_id = "gpu_0";  // Default to first GPU
    id.resource_type = resource_type;
    id.layer_id = current_layer_id_;
    id.component = component;
    id.timestamp_us = std::chrono::duration_cast<std::chrono::microseconds>(
        std::chrono::high_resolution_clock::now().time_since_epoch()).count();
    return id;
}

void llama_resource_instrumentation::write_log_entry(const std::string& entry) {
    if (log_file_ && log_file_->is_open()) {
        *log_file_ << entry << std::endl;
    }
}

std::string llama_resource_instrumentation::get_current_timestamp() {
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(
        now.time_since_epoch()) % 1000;
    
    std::stringstream ss;
    ss << std::put_time(std::localtime(&time_t), "%Y-%m-%d %H:%M:%S");
    ss << "." << std::setfill('0') << std::setw(3) << ms.count();
    return ss.str();
}

std::string llama_resource_instrumentation::escape_json_string(const std::string& input) {
    std::string escaped = input;
    size_t pos = 0;
    while ((pos = escaped.find('"', pos)) != std::string::npos) {
        escaped.insert(pos, "\\");
        pos += 2;
    }
    return escaped;
}

std::string llama_resource_instrumentation::generate_session_id() {
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    auto ms = std::chrono::duration_cast<std::chrono::microseconds>(
        now.time_since_epoch()) % 1000000;
    
    std::stringstream ss;
    ss << "resource_sess_" 
       << std::put_time(std::localtime(&time_t), "%Y%m%d_%H%M%S_")
       << std::setfill('0') << std::setw(6) << ms.count();
    return ss.str();
}

// ============================================================================
// GLOBAL INTERFACE FUNCTIONS
// ============================================================================

void llama_resource_instrumentation_init(llama_resource_level level, const std::string& log_path) {
    if (g_resource_instr) {
        return;  // Already initialized
    }
    
    try {
        g_resource_instr = std::make_unique<llama_resource_instrumentation>(level, log_path);
        g_resource_instr->enable();
        printf(RESOURCE_LOG_PREFIX "Resource instrumentation initialized: level=%s, path=%s\n",
               (level == llama_resource_level::MINIMAL ? "MINIMAL" :
                level == llama_resource_level::DETAILED ? "DETAILED" : "VERBOSE"),
               log_path.c_str());
    } catch (const std::exception& e) {
        fprintf(stderr, RESOURCE_LOG_PREFIX "Failed to initialize: %s\n", e.what());
    }
}

void llama_resource_instrumentation_free() {
    if (g_resource_instr) {
        printf(RESOURCE_LOG_PREFIX "Resource instrumentation shutting down\n");
        g_resource_instr.reset();
    }
}
