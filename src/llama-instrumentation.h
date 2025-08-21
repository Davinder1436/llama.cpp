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
#include <sstream>
#include <iomanip>
#include <stdexcept>

#define INSTR_LOG_PREFIX "[INSTR] "

// Instrumentation levels for controlling logging detail
enum class llama_instr_level {
    MINIMAL,    // Only layer boundaries and final outputs
    DETAILED,   // Intermediate tensor metadata
    VERBOSE     // All tensor operations (may impact performance)
};

// Metadata for tensor snapshots (no actual data, just overview)
struct llama_tensor_metadata {
    std::string name;
    std::string operation;
    std::vector<int64_t> shape;
    std::string dtype;
    size_t element_count;
    double min_val, max_val, mean_val, std_val;
    std::chrono::high_resolution_clock::time_point timestamp;
    size_t memory_bytes;
    
    std::string to_json() const;
};

// Step execution metrics
struct llama_step_metrics {
    std::string step_name;
    int step_id;
    int layer_id;
    std::chrono::microseconds execution_time;
    std::vector<llama_tensor_metadata> inputs;
    std::vector<llama_tensor_metadata> outputs;
    std::map<std::string, double> custom_metrics;
    std::string notes;
    
    std::string to_json() const;
};

// Token processing information
struct llama_token_info {
    int token_id;
    std::string token_text;
    double probability;
    int position;
    llama_seq_id seq_id;
    std::chrono::high_resolution_clock::time_point timestamp;
    
    std::string to_json() const;
};

// Layer-specific operation details
struct llama_layer_info {
    int layer_id;
    std::string layer_type;  // "attention", "feed_forward", "norm", etc.
    std::string operation;   // "self_attention", "mlp", "layer_norm", etc.
    std::chrono::microseconds execution_time;
    std::map<std::string, double> layer_metrics;
    
    std::string to_json() const;
};

// Enhanced sampling state information with layer details
struct llama_sampling_state {
    std::vector<double> logits_sample;  // Top N logits
    std::vector<int> top_tokens;        // Top N token IDs
    std::vector<double> top_probs;      // Top N probabilities after softmax
    std::vector<std::string> top_token_texts;  // Human-readable token texts
    int selected_token;
    double selected_prob;
    std::string sampling_method;
    std::map<std::string, double> sampling_params;
    std::vector<llama_layer_info> layer_details;  // Per-layer processing info
    
    std::string to_json() const;
};

// Main instrumentation collector class
class llama_instrumentation {
private:
    llama_instr_level level_;
    std::string log_file_path_;
    std::unique_ptr<std::ofstream> log_file_;
    size_t current_step_id_;
    std::chrono::high_resolution_clock::time_point session_start_;
    std::string session_id_;
    bool enabled_;
    
    // Current inference state
    std::string current_prompt_;
    std::vector<llama_token_info> input_tokens_;
    std::vector<llama_token_info> output_tokens_;
    int current_layer_idx_;
    std::string current_step_name_;
    std::chrono::high_resolution_clock::time_point step_start_time_;
    
public:
    llama_instrumentation(llama_instr_level level = llama_instr_level::DETAILED, 
                         const std::string& log_path = "llama_inference_trace.log");
    ~llama_instrumentation();
    
    // Control methods
    void enable();
    void disable();
    void set_level(llama_instr_level level);
    void flush();
    
    // Session management
    void begin_session(const std::string& prompt, const struct llama_model* model);
    void end_session();
    
    // Step tracking
    void begin_step(const std::string& step_name, int layer_id = -1);
    void end_step(const std::string& notes = "");
    
    // Token tracking
    void log_input_tokens(const llama_token* tokens, int n_tokens, 
                         const struct llama_vocab* vocab);
    void log_output_token(llama_token token, double probability, 
                         const struct llama_vocab* vocab);
    
    // Tensor metadata logging (no actual data)
    void log_tensor_metadata(const struct ggml_tensor* tensor, 
                           const std::string& operation,
                           const std::string& role = "intermediate");
    
    // Sampling state logging
    void log_sampling_state(const llama_sampling_state& state);
    
    // KV cache operations
    void log_kv_cache_update(int layer_id, llama_seq_id seq_id, 
                           llama_pos pos_start, llama_pos pos_end,
                           const std::string& operation);
    
    // Performance metrics
    void log_performance_metric(const std::string& metric_name, 
                              double value, const std::string& unit = "");
    
    // Utility methods
    static llama_tensor_metadata extract_tensor_metadata(const struct ggml_tensor* tensor,
                                                        const std::string& operation);
    static bool is_quantized_tensor(const struct ggml_tensor* tensor);
    static double get_compression_ratio(const struct ggml_tensor* tensor);
    static std::string get_current_timestamp();
    static std::string generate_session_id();
    
private:
    void write_log_entry(const std::string& entry);
    void write_session_header(const std::string& prompt, const struct llama_model* model);
    void write_session_footer();
    std::string format_tensor_shape(const std::vector<int64_t>& shape);
    double calculate_tensor_stats(const struct ggml_tensor* tensor, 
                                const std::string& stat_type);
};

// Global instrumentation instance
extern std::unique_ptr<llama_instrumentation> g_llama_instr;

// Convenience macros for instrumentation
#define INSTR_BEGIN_SESSION(prompt, model) \
    if (g_llama_instr) g_llama_instr->begin_session(prompt, model)

#define INSTR_END_SESSION() \
    if (g_llama_instr) g_llama_instr->end_session()

#define INSTR_BEGIN_STEP(step_name, layer_id) \
    if (g_llama_instr) g_llama_instr->begin_step(step_name, layer_id)

#define INSTR_END_STEP(notes) \
    if (g_llama_instr) g_llama_instr->end_step(notes)

#define INSTR_LOG_TENSOR(tensor, operation, role) \
    if (g_llama_instr) g_llama_instr->log_tensor_metadata(tensor, operation, role)

#define INSTR_LOG_TOKENS_IN(tokens, n_tokens, vocab) \
    if (g_llama_instr) g_llama_instr->log_input_tokens(tokens, n_tokens, vocab)

#define INSTR_LOG_TOKEN_OUT(token, prob, vocab) \
    if (g_llama_instr) g_llama_instr->log_output_token(token, prob, vocab)

#define INSTR_LOG_SAMPLING(state) \
    if (g_llama_instr) g_llama_instr->log_sampling_state(state)

#define INSTR_LOG_PERF(metric_name, value, unit) \
    if (g_llama_instr) g_llama_instr->log_performance_metric(metric_name, value, unit)

// Initialization functions
void llama_instrumentation_init(llama_instr_level level = llama_instr_level::DETAILED,
                               const std::string& log_path = "llama_inference_trace.log");
void llama_instrumentation_free();
