#include "llama-instrumentation.h"
#include "llama-vocab.h"
#include "llama-impl.h"

#include <algorithm>
#include <numeric>
#include <cmath>
#include <random>
#include <stdexcept>

// Global instrumentation instance
std::unique_ptr<llama_instrumentation> g_llama_instr = nullptr;

// Helper function implementations for JSON serialization
std::string llama_tensor_metadata::to_json() const {
    std::stringstream ss;
    ss << std::fixed << std::setprecision(6);
    ss << "{";
    ss << "\"name\":\"" << name << "\",";
    ss << "\"operation\":\"" << operation << "\",";
    ss << "\"shape\":[";
    for (size_t i = 0; i < shape.size(); ++i) {
        if (i > 0) ss << ",";
        ss << shape[i];
    }
    ss << "],";
    ss << "\"dtype\":\"" << dtype << "\",";
    ss << "\"element_count\":" << element_count << ",";
    ss << "\"min_val\":" << min_val << ",";
    ss << "\"max_val\":" << max_val << ",";
    ss << "\"mean_val\":" << mean_val << ",";
    ss << "\"std_val\":" << std_val << ",";
    ss << "\"memory_bytes\":" << memory_bytes << ",";
    ss << "\"timestamp\":\"" << std::chrono::duration_cast<std::chrono::microseconds>(
        timestamp.time_since_epoch()).count() << "\"";
    ss << "}";
    return ss.str();
}

std::string llama_step_metrics::to_json() const {
    std::stringstream ss;
    ss << "{";
    ss << "\"step_name\":\"" << step_name << "\",";
    ss << "\"step_id\":" << step_id << ",";
    ss << "\"layer_id\":" << layer_id << ",";
    ss << "\"execution_time_us\":" << execution_time.count() << ",";
    ss << "\"inputs\":[";
    for (size_t i = 0; i < inputs.size(); ++i) {
        if (i > 0) ss << ",";
        ss << inputs[i].to_json();
    }
    ss << "],";
    ss << "\"outputs\":[";
    for (size_t i = 0; i < outputs.size(); ++i) {
        if (i > 0) ss << ",";
        ss << outputs[i].to_json();
    }
    ss << "],";
    ss << "\"custom_metrics\":{";
    bool first = true;
    for (const auto& [key, value] : custom_metrics) {
        if (!first) ss << ",";
        ss << "\"" << key << "\":" << value;
        first = false;
    }
    ss << "},";
    ss << "\"notes\":\"" << notes << "\"";
    ss << "}";
    return ss.str();
}

std::string llama_token_info::to_json() const {
    std::stringstream ss;
    ss << std::fixed << std::setprecision(6);
    ss << "{";
    ss << "\"token_id\":" << token_id << ",";
    ss << "\"token_text\":\"" << token_text << "\",";
    ss << "\"probability\":" << probability << ",";
    ss << "\"position\":" << position << ",";
    ss << "\"seq_id\":" << seq_id << ",";
    ss << "\"timestamp\":\"" << std::chrono::duration_cast<std::chrono::microseconds>(
        timestamp.time_since_epoch()).count() << "\"";
    ss << "}";
    return ss.str();
}

std::string llama_layer_info::to_json() const {
    std::stringstream ss;
    ss << std::fixed << std::setprecision(6);
    ss << "{";
    ss << "\"layer_id\":" << layer_id << ",";
    ss << "\"layer_type\":\"" << layer_type << "\",";
    ss << "\"operation\":\"" << operation << "\",";
    ss << "\"execution_time_us\":" << execution_time.count() << ",";
    ss << "\"layer_metrics\":{";
    bool first = true;
    for (const auto& [key, value] : layer_metrics) {
        if (!first) ss << ",";
        ss << "\"" << key << "\":" << value;
        first = false;
    }
    ss << "}";
    ss << "}";
    return ss.str();
}

std::string llama_sampling_state::to_json() const {
    std::stringstream ss;
    ss << std::fixed << std::setprecision(6);
    ss << "{";
    ss << "\"logits_sample\":[";
    for (size_t i = 0; i < logits_sample.size(); ++i) {
        if (i > 0) ss << ",";
        ss << logits_sample[i];
    }
    ss << "],";
    ss << "\"top_tokens\":[";
    for (size_t i = 0; i < top_tokens.size(); ++i) {
        if (i > 0) ss << ",";
        ss << top_tokens[i];
    }
    ss << "],";
    ss << "\"top_probs\":[";
    for (size_t i = 0; i < top_probs.size(); ++i) {
        if (i > 0) ss << ",";
        ss << top_probs[i];
    }
    ss << "],";
    ss << "\"top_token_texts\":[";
    for (size_t i = 0; i < top_token_texts.size(); ++i) {
        if (i > 0) ss << ",";
        ss << "\"" << top_token_texts[i] << "\"";
    }
    ss << "],";
    ss << "\"selected_token\":" << selected_token << ",";
    ss << "\"selected_prob\":" << selected_prob << ",";
    ss << "\"sampling_method\":\"" << sampling_method << "\",";
    ss << "\"sampling_params\":{";
    bool first = true;
    for (const auto& [key, value] : sampling_params) {
        if (!first) ss << ",";
        ss << "\"" << key << "\":" << value;
        first = false;
    }
    ss << "},";
    ss << "\"layer_details\":[";
    for (size_t i = 0; i < layer_details.size(); ++i) {
        if (i > 0) ss << ",";
        ss << layer_details[i].to_json();
    }
    ss << "]";
    ss << "}";
    return ss.str();
}

// Constructor
llama_instrumentation::llama_instrumentation(llama_instr_level level, const std::string& log_path)
    : level_(level)
    , log_file_path_(log_path)
    , current_step_id_(0)
    , session_start_(std::chrono::high_resolution_clock::now())
    , session_id_(generate_session_id())
    , enabled_(true)
    , current_layer_idx_(-1)
    , current_step_name_("")
{
    log_file_ = std::make_unique<std::ofstream>(log_file_path_, std::ios::app);
    if (!log_file_->is_open()) {
        LLAMA_LOG_ERROR("Failed to open instrumentation log file: %s\n", log_file_path_.c_str());
        enabled_ = false;
    } else {
        LLAMA_LOG_INFO("Instrumentation logging to: %s\n", log_file_path_.c_str());
    }
}

// Destructor
llama_instrumentation::~llama_instrumentation() {
    if (log_file_ && log_file_->is_open()) {
        flush();
        log_file_->close();
    }
}

void llama_instrumentation::enable() {
    enabled_ = true;
    LLAMA_LOG_INFO(INSTR_LOG_PREFIX "Instrumentation enabled\n");
}

void llama_instrumentation::disable() {
    enabled_ = false;
    LLAMA_LOG_INFO(INSTR_LOG_PREFIX "Instrumentation disabled\n");
}

void llama_instrumentation::set_level(llama_instr_level level) {
    level_ = level;
    LLAMA_LOG_INFO(INSTR_LOG_PREFIX "Instrumentation level set to: %d\n", static_cast<int>(level));
}

void llama_instrumentation::flush() {
    if (log_file_) {
        log_file_->flush();
    }
}

void llama_instrumentation::begin_session(const std::string& prompt, const struct llama_model* model) {
    if (!enabled_) return;
    
    current_prompt_ = prompt;
    current_step_id_ = 0;
    session_start_ = std::chrono::high_resolution_clock::now();
    session_id_ = generate_session_id();
    
    input_tokens_.clear();
    output_tokens_.clear();
    
    write_session_header(prompt, model);
    
    LLAMA_LOG_INFO(INSTR_LOG_PREFIX "Begin session: %s\n", session_id_.c_str());
}

void llama_instrumentation::end_session() {
    if (!enabled_) return;
    
    write_session_footer();
    flush();
    
    LLAMA_LOG_INFO(INSTR_LOG_PREFIX "End session: %s\n", session_id_.c_str());
}

void llama_instrumentation::begin_step(const std::string& step_name, int layer_id) {
    if (!enabled_) return;
    
    current_step_name_ = step_name;
    current_layer_idx_ = layer_id;
    step_start_time_ = std::chrono::high_resolution_clock::now();
    
    if (level_ >= llama_instr_level::DETAILED) {
        std::stringstream entry;
        entry << "{\"event\":\"step_begin\",\"timestamp\":\"" << get_current_timestamp() 
              << "\",\"step_id\":" << current_step_id_ 
              << ",\"step_name\":\"" << step_name 
              << "\",\"layer_id\":" << layer_id 
              << ",\"session_id\":\"" << session_id_ << "\"}";
        write_log_entry(entry.str());
    }
}

void llama_instrumentation::end_step(const std::string& notes) {
    if (!enabled_ || current_step_name_.empty()) return;
    
    auto end_time = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end_time - step_start_time_);
    
    llama_step_metrics metrics;
    metrics.step_name = current_step_name_;
    metrics.step_id = current_step_id_;
    metrics.layer_id = current_layer_idx_;
    metrics.execution_time = duration;
    metrics.notes = notes;
    
    std::stringstream entry;
    entry << "{\"event\":\"step_end\",\"timestamp\":\"" << get_current_timestamp() 
          << "\",\"metrics\":" << metrics.to_json() 
          << ",\"session_id\":\"" << session_id_ << "\"}";
    write_log_entry(entry.str());
    
    current_step_id_++;
    current_step_name_.clear();
}

void llama_instrumentation::log_input_tokens(const llama_token* tokens, int n_tokens, 
                                           const struct llama_vocab* /* vocab */) {
    if (!enabled_ || level_ < llama_instr_level::MINIMAL) return;
    
    input_tokens_.clear();
    std::stringstream token_list;
    token_list << "[";
    
    for (int i = 0; i < n_tokens; i++) {
        llama_token_info info;
        info.token_id = tokens[i];
        info.token_text = ""; // TODO: Use llama_token_to_piece with proper buffer management
        info.probability = 1.0; // Input tokens have probability 1
        info.position = i;
        info.seq_id = 0; // Default sequence
        info.timestamp = std::chrono::high_resolution_clock::now();
        
        input_tokens_.push_back(info);
        
        if (i > 0) token_list << ",";
        token_list << info.to_json();
    }
    token_list << "]";
    
    std::stringstream entry;
    entry << "{\"event\":\"input_tokens\",\"timestamp\":\"" << get_current_timestamp() 
          << "\",\"n_tokens\":" << n_tokens 
          << ",\"tokens\":" << token_list.str()
          << ",\"session_id\":\"" << session_id_ << "\"}";
    write_log_entry(entry.str());
}

void llama_instrumentation::log_output_token(llama_token token, double probability, 
                                           const struct llama_vocab* /* vocab */) {
    if (!enabled_) return;
    
    llama_token_info info;
    info.token_id = token;
    info.token_text = ""; // TODO: Use llama_token_to_piece with proper buffer management
    info.probability = probability;
    info.position = static_cast<int>(output_tokens_.size());
    info.seq_id = 0; // Default sequence
    info.timestamp = std::chrono::high_resolution_clock::now();
    
    output_tokens_.push_back(info);
    
    std::stringstream entry;
    entry << "{\"event\":\"output_token\",\"timestamp\":\"" << get_current_timestamp() 
          << "\",\"token\":" << info.to_json()
          << ",\"session_id\":\"" << session_id_ << "\"}";
    write_log_entry(entry.str());
}

void llama_instrumentation::log_tensor_metadata(const struct ggml_tensor* tensor, 
                                               const std::string& operation,
                                               const std::string& role) {
    if (!enabled_ || level_ < llama_instr_level::DETAILED) return;
    
    if (!tensor) return;
    
    llama_tensor_metadata metadata = extract_tensor_metadata(tensor, operation);
    
    std::stringstream entry;
    entry << "{\"event\":\"tensor_metadata\",\"timestamp\":\"" << get_current_timestamp() 
          << "\",\"role\":\"" << role 
          << "\",\"step_name\":\"" << current_step_name_
          << "\",\"layer_id\":" << current_layer_idx_
          << ",\"metadata\":" << metadata.to_json()
          << ",\"session_id\":\"" << session_id_ << "\"}";
    write_log_entry(entry.str());
}

void llama_instrumentation::log_sampling_state(const llama_sampling_state& state) {
    if (!enabled_) return;
    
    std::stringstream entry;
    entry << "{\"event\":\"sampling_state\",\"timestamp\":\"" << get_current_timestamp() 
          << "\",\"sampling\":" << state.to_json()
          << ",\"session_id\":\"" << session_id_ << "\"}";
    write_log_entry(entry.str());
}

void llama_instrumentation::log_kv_cache_update(int layer_id, llama_seq_id seq_id, 
                                               llama_pos pos_start, llama_pos pos_end,
                                               const std::string& operation) {
    if (!enabled_ || level_ < llama_instr_level::DETAILED) return;
    
    std::stringstream entry;
    entry << "{\"event\":\"kv_cache_update\",\"timestamp\":\"" << get_current_timestamp() 
          << "\",\"layer_id\":" << layer_id
          << ",\"seq_id\":" << seq_id
          << ",\"pos_start\":" << pos_start
          << ",\"pos_end\":" << pos_end
          << ",\"operation\":\"" << operation
          << "\",\"session_id\":\"" << session_id_ << "\"}";
    write_log_entry(entry.str());
}

void llama_instrumentation::log_performance_metric(const std::string& metric_name, 
                                                  double value, const std::string& unit) {
    if (!enabled_) return;
    
    std::stringstream entry;
    entry << "{\"event\":\"performance_metric\",\"timestamp\":\"" << get_current_timestamp() 
          << "\",\"metric_name\":\"" << metric_name
          << "\",\"value\":" << value
          << ",\"unit\":\"" << unit
          << "\",\"session_id\":\"" << session_id_ << "\"}";
    write_log_entry(entry.str());
}

// Static utility methods
llama_tensor_metadata llama_instrumentation::extract_tensor_metadata(const struct ggml_tensor* tensor,
                                                                     const std::string& operation) {
    llama_tensor_metadata metadata;
    
    metadata.name = std::string(tensor->name);
    metadata.operation = operation;
    metadata.dtype = ggml_type_name(tensor->type);
    metadata.element_count = ggml_nelements(tensor);
    metadata.memory_bytes = ggml_nbytes(tensor);
    metadata.timestamp = std::chrono::high_resolution_clock::now();
    
    // Extract shape
    for (int i = 0; i < ggml_n_dims(tensor); ++i) {
        metadata.shape.push_back(tensor->ne[i]);
    }
    
    // Calculate basic statistics (approximation - we don't read all data for performance)
    // For now, just set default values
    metadata.min_val = 0.0;
    metadata.max_val = 0.0;
    metadata.mean_val = 0.0;
    metadata.std_val = 0.0;
    
    // Add quantization-specific information for educational purposes
    if (tensor->type != GGML_TYPE_F32 && tensor->type != GGML_TYPE_F16) {
        // For educational logging, calculate compression ratio
        size_t uncompressed_bytes = ggml_nelements(tensor) * sizeof(float);
        (void)uncompressed_bytes; // Suppress unused variable warning
        // Note: This information could be added to logs in future versions
    }
    
    return metadata;
}

bool llama_instrumentation::is_quantized_tensor(const struct ggml_tensor* tensor) {
    if (!tensor) return false;
    return ggml_is_quantized(tensor->type);
}

double llama_instrumentation::get_compression_ratio(const struct ggml_tensor* tensor) {
    if (!tensor) return 1.0;
    
    // Calculate uncompressed size (assuming F32)
    size_t uncompressed_bytes = ggml_nelements(tensor) * sizeof(float);
    size_t actual_bytes = ggml_nbytes(tensor);
    
    if (actual_bytes == 0) return 1.0;
    return (double)uncompressed_bytes / (double)actual_bytes;
}

std::string llama_instrumentation::get_current_timestamp() {
    auto now = std::chrono::high_resolution_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
    auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(now.time_since_epoch()) % 1000;
    
    std::stringstream ss;
    ss << std::put_time(std::localtime(&time_t), "%Y-%m-%d %H:%M:%S");
    ss << '.' << std::setfill('0') << std::setw(3) << ms.count();
    return ss.str();
}

std::string llama_instrumentation::generate_session_id() {
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<> dis(0, 15);
    
    std::stringstream ss;
    ss << "sess_";
    for (int i = 0; i < 8; ++i) {
        ss << std::hex << dis(gen);
    }
    return ss.str();
}

void llama_instrumentation::write_log_entry(const std::string& entry) {
    if (!log_file_ || !enabled_) return;
    
    *log_file_ << entry << std::endl;
    
    if (level_ >= llama_instr_level::VERBOSE) {
        LLAMA_LOG_DEBUG(INSTR_LOG_PREFIX "%s\n", entry.c_str());
    }
}

void llama_instrumentation::write_session_header(const std::string& prompt, const struct llama_model* model) {
    if (!enabled_) return;
    
    std::stringstream header;
    header << "{\"event\":\"session_start\",\"timestamp\":\"" << get_current_timestamp() 
           << "\",\"session_id\":\"" << session_id_ 
           << "\",\"prompt\":\"";
    
    // Escape prompt for JSON
    for (char c : prompt) {
        if (c == '"') header << "\\\"";
        else if (c == '\\') header << "\\\\";
        else if (c == '\n') header << "\\n";
        else if (c == '\r') header << "\\r";
        else if (c == '\t') header << "\\t";
        else header << c;
    }
    
    header << "\",\"model_info\":{";
    if (model) {
        header << "\"n_vocab\":" << llama_vocab_n_tokens(llama_model_get_vocab(model)) << ",";
        header << "\"n_ctx_train\":" << llama_model_n_ctx_train(model) << ",";
        header << "\"n_embd\":" << llama_model_n_embd(model) << ",";
        header << "\"n_layer\":" << llama_model_n_layer(model) << ",";
        header << "\"n_head\":" << llama_model_n_head(model);
    }
    header << "}}";
    
    write_log_entry(header.str());
}

void llama_instrumentation::write_session_footer() {
    if (!enabled_) return;
    
    auto session_end = std::chrono::high_resolution_clock::now();
    auto session_duration = std::chrono::duration_cast<std::chrono::milliseconds>(session_end - session_start_);
    
    std::stringstream footer;
    footer << "{\"event\":\"session_end\",\"timestamp\":\"" << get_current_timestamp() 
           << "\",\"session_id\":\"" << session_id_ 
           << "\",\"duration_ms\":" << session_duration.count()
           << ",\"total_steps\":" << current_step_id_
           << ",\"input_token_count\":" << input_tokens_.size()
           << ",\"output_token_count\":" << output_tokens_.size()
           << "}";
    
    write_log_entry(footer.str());
}

std::string llama_instrumentation::format_tensor_shape(const std::vector<int64_t>& shape) {
    std::stringstream ss;
    ss << "[";
    for (size_t i = 0; i < shape.size(); ++i) {
        if (i > 0) ss << "x";
        ss << shape[i];
    }
    ss << "]";
    return ss.str();
}

// Global initialization functions
void llama_instrumentation_init(llama_instr_level level, const std::string& log_path) {
    if (g_llama_instr) {
        LLAMA_LOG_WARN("Instrumentation already initialized\n");
        return;
    }
    
    g_llama_instr = std::make_unique<llama_instrumentation>(level, log_path);
    LLAMA_LOG_INFO(INSTR_LOG_PREFIX "Initialized with level %d, logging to: %s\n", 
            static_cast<int>(level), log_path.c_str());
}

void llama_instrumentation_free() {
    if (g_llama_instr) {
        g_llama_instr.reset();
        LLAMA_LOG_INFO(INSTR_LOG_PREFIX "Freed instrumentation\n");
    }
}
