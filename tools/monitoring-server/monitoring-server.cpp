#include "llama.h"
#include "llama-instrumentation.h"
#include "common.h"
#include "log.h"

#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include <cmath>
#include <fstream>
#include <sstream>
#include <thread>
#include <mutex>
#include <atomic>
#include <map>
#include <memory>
#include <chrono>
#include <iomanip>
#include <sstream>
#include <ctime>
#include <chrono>

// HTTP server library (same as used in tools/server)
#define CPPHTTPLIB_FORM_URL_ENCODED_PAYLOAD_MAX_LENGTH 1048576
#define CPPHTTPLIB_LISTEN_BACKLOG 512
#define CPPHTTPLIB_TCP_NODELAY true
#include <cpp-httplib/httplib.h>

#define JSON_ASSERT GGML_ASSERT
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// Global state for the monitoring server
struct MonitoringServerState {
    llama_model* model;
    llama_context* ctx;
    const llama_vocab* vocab;
    std::mutex model_mutex;
    std::atomic<bool> model_loaded{false};
    std::map<std::string, std::string> active_sessions; // session_id -> log_file_path
    std::mutex sessions_mutex;
};

static MonitoringServerState g_server_state;

// Utility function to generate unique session ID
static std::string generate_session_id() {
    // Generate incremental session ID based on current datetime
    // Format: sess_YYYYMMDD_HHMMSS_microseconds
    auto now = std::chrono::system_clock::now();
    auto time_t = std::chrono::system_clock::to_time_t(now);
    auto microseconds = std::chrono::duration_cast<std::chrono::microseconds>(
        now.time_since_epoch()) % 1000000;
    
    std::ostringstream ss;
    ss << "sess_" 
       << std::put_time(std::localtime(&time_t), "%Y%m%d_%H%M%S")
       << "_" << std::setfill('0') << std::setw(6) << microseconds.count();
    
    return ss.str();
}

// Load the model (similar to test_inference_instrumentation.cpp)
static bool load_model() {
    try {
        std::cout << "🔧 Initializing llama backend..." << std::endl;
        ggml_backend_load_all();
        
        std::cout << "📚 Loading Gemma-3 1B model..." << std::endl;
        llama_model_params model_params = llama_model_default_params();
        model_params.n_gpu_layers = 0; // Use CPU for this server
        
        llama_model* model_ptr = llama_model_load_from_file("downloads/gemma-3-1b-it-Q4_K_M.gguf", model_params);
        if (!model_ptr) {
            std::cerr << "❌ Failed to load model!" << std::endl;
            return false;
        }
        
        g_server_state.model = model_ptr;
        
        // Get vocab
        g_server_state.vocab = llama_model_get_vocab(model_ptr);
        if (!g_server_state.vocab) {
            std::cerr << "❌ Failed to get vocabulary from model!" << std::endl;
            return false;
        }
        std::cout << "📝 Vocabulary loaded successfully" << std::endl;
        
        // Create context
        std::cout << "⚙️ Creating inference context..." << std::endl;
        llama_context_params ctx_params = llama_context_default_params();
        ctx_params.n_ctx = 512;      // Context length
        ctx_params.n_batch = 32;     // Batch size  
        ctx_params.n_threads = 4;    // CPU threads
        
        llama_context* ctx_ptr = llama_init_from_model(model_ptr, ctx_params);
        if (!ctx_ptr) {
            std::cerr << "❌ Failed to create context!" << std::endl;
            return false;
        }
        
        g_server_state.ctx = ctx_ptr;
        g_server_state.model_loaded = true;
        
        std::cout << "✅ Model loaded successfully!" << std::endl;
        return true;
    } catch (const std::exception& e) {
        std::cerr << "❌ Error loading model: " << e.what() << std::endl;
        return false;
    }
}

// Function to perform inference and generate logs (similar to test_inference_instrumentation.cpp)
static std::string run_inference_with_logs(const std::string& prompt, const std::string& session_id) {
    if (!g_server_state.model_loaded) {
        return "";
    }
    
    try {
        std::lock_guard<std::mutex> lock(g_server_state.model_mutex);
        
        // Create log file path for this session
        std::string log_path = "tools/monitoring-server/logs/" + session_id + ".log";
        
        // Initialize instrumentation with session-specific log file
        llama_instrumentation instr(llama_instr_level::DETAILED, log_path);
        instr.enable();
        
        std::cout << "📊 Starting instrumented inference for session: " << session_id << std::endl;
        
        // Begin instrumented session
        instr.begin_session(prompt, g_server_state.model);
        
        // Tokenize the prompt
        const int n_prompt = -llama_tokenize(g_server_state.vocab, prompt.c_str(), prompt.length(), NULL, 0, true, true);
        std::vector<llama_token> prompt_tokens(n_prompt);
        llama_tokenize(g_server_state.vocab, prompt.c_str(), prompt.length(), prompt_tokens.data(), n_prompt, true, true);
        
        std::cout << "🔤 Tokenized prompt: " << n_prompt << " tokens" << std::endl;
        
        // Create batch with all prompt tokens
        llama_batch batch = llama_batch_init(n_prompt, 0, 1);
        
        for (int i = 0; i < n_prompt; ++i) {
            batch.token[i] = prompt_tokens[i];
            batch.pos[i] = i;
            batch.n_seq_id[i] = 1;
            batch.seq_id[i][0] = 0;
            batch.logits[i] = (i == n_prompt - 1);
        }
        batch.n_tokens = n_prompt;
        
        // Clear memory cache before processing new request to avoid sequence position conflicts
        llama_memory_t mem = llama_get_memory(g_server_state.ctx);
        llama_memory_seq_rm(mem, -1, -1, -1); // Remove all sequences
        
        // Process the prompt
        instr.begin_step("prompt_processing", 0);
        std::cout << "🧠 Processing prompt..." << std::endl;
        if (llama_decode(g_server_state.ctx, batch) != 0) {
            std::cerr << "❌ Failed to decode prompt!" << std::endl;
            return "";
        }
        instr.end_step("Prompt processed successfully");
        std::cout << "✅ Prompt processed successfully!" << std::endl;
        
        // Generate tokens with proper stopping conditions
        int max_tokens = 512; // Reasonable limit but much higher
        std::vector<llama_token> all_tokens = prompt_tokens;
        std::string generated_text = "";
        
        // Get stopping tokens for Gemma model
        llama_token eos_token = llama_vocab_eos(g_server_state.vocab);
        llama_token end_of_turn_token = 106; // <end_of_turn> token for Gemma
        
        std::cout << "🎯 Starting generation with max_tokens=" << max_tokens << std::endl;
        std::cout << "🛑 Stop tokens: EOS=" << eos_token << ", end_of_turn=" << end_of_turn_token << std::endl;
        
        for (int i = 0; i < max_tokens; i++) {
            // Get logits and sample next token
            float* logits = llama_get_logits_ith(g_server_state.ctx, -1);
            if (logits == nullptr) {
                std::cout << "❌ Failed to get logits!" << std::endl;
                break;
            }
            
            int vocab_size = llama_vocab_n_tokens(g_server_state.vocab);
            
            // Enhanced probability distribution analysis
            std::vector<std::pair<llama_token, float>> token_logits;
            for (llama_token token_id = 0; token_id < vocab_size; token_id++) {
                token_logits.push_back({token_id, logits[token_id]});
            }
            
            // Sort by logits (descending)
            std::sort(token_logits.begin(), token_logits.end(), 
                     [](const auto& a, const auto& b) { return a.second > b.second; });
            
            // Calculate softmax probabilities for top tokens
            std::vector<std::pair<llama_token, float>> top_tokens_with_probs;
            const int top_k = 10;
            
            float max_logit = token_logits[0].second;
            float sum_exp = 0.0f;
            
            for (int k = 0; k < std::min(top_k, (int)token_logits.size()); k++) {
                float exp_val = std::exp(token_logits[k].second - max_logit);
                sum_exp += exp_val;
                top_tokens_with_probs.push_back({token_logits[k].first, exp_val});
            }
            
            for (auto& pair : top_tokens_with_probs) {
                pair.second /= sum_exp;
            }
            
            // Create sampling state for instrumentation
            llama_sampling_state sampling_state;
            if (!top_tokens_with_probs.empty()) {
                sampling_state.selected_token = top_tokens_with_probs[0].first;
                sampling_state.selected_prob = top_tokens_with_probs[0].second;
            } else {
                sampling_state.selected_token = 0;
                sampling_state.selected_prob = 0.0f;
            }
            sampling_state.sampling_method = "greedy";
            
            // Fill top tokens and probabilities for instrumentation
            for (int k = 0; k < std::min(top_k, (int)top_tokens_with_probs.size()); k++) {
                sampling_state.top_tokens.push_back(top_tokens_with_probs[k].first);
                sampling_state.top_probs.push_back(top_tokens_with_probs[k].second);
                
                // Convert token to readable text
                char token_str[256];
                int n_chars = llama_token_to_piece(g_server_state.vocab, top_tokens_with_probs[k].first, 
                                                  token_str, sizeof(token_str), 0, true);
                std::string token_text;
                if (n_chars > 0 && n_chars < (int)sizeof(token_str)) {
                    token_text = std::string(token_str, n_chars);
                } else {
                    token_text = "<unknown>";
                }
                sampling_state.top_token_texts.push_back(token_text);
                
                // Find logit value
                for (int j = 0; j < (int)token_logits.size(); j++) {
                    if (token_logits[j].first == top_tokens_with_probs[k].first) {
                        sampling_state.logits_sample.push_back(token_logits[j].second);
                        break;
                    }
                }
            }
            
            // Add layer information (simulated)
            int total_layers = llama_model_n_layer(g_server_state.model);
            for (int layer = 0; layer < total_layers; layer++) {
                llama_layer_info layer_info;
                layer_info.layer_id = layer;
                layer_info.layer_type = (layer % 2 == 0) ? "attention" : "feed_forward";
                layer_info.operation = (layer % 2 == 0) ? "multi_head_self_attention" : "mlp_projection";
                layer_info.execution_time = std::chrono::microseconds(1000 + (layer * 50));
                
                // Add layer metrics
                if (layer % 2 == 0) { // attention layer
                    layer_info.layer_metrics["attention_heads"] = 4.0;
                    layer_info.layer_metrics["hidden_dim"] = 1152.0;
                    layer_info.layer_metrics["intermediate_dim"] = 0.0;
                } else { // feed forward layer
                    layer_info.layer_metrics["attention_heads"] = 0.0;
                    layer_info.layer_metrics["hidden_dim"] = 1152.0;
                    layer_info.layer_metrics["intermediate_dim"] = 6912.0;
                }
                
                sampling_state.layer_details.push_back(layer_info);
            }
            
            // Log the sampling state
            instr.log_sampling_state(sampling_state);
            instr.flush(); // Force immediate write to disk
            
            // Select the greedy token
            llama_token next_token = top_tokens_with_probs[0].first;
            
            // Check for end of sequence with multiple stopping conditions
            if (next_token == eos_token || next_token == end_of_turn_token) {
                std::cout << "🏁 End of sequence reached (token=" << next_token << ")" << std::endl;
                break;
            }
            
            // Convert token to text
            char token_str[256];
            int n_chars = llama_token_to_piece(g_server_state.vocab, next_token, token_str, sizeof(token_str), 0, true);
            if (n_chars > 0) {
                generated_text += std::string(token_str, n_chars);
                std::cout << "🔤 Token " << (i+1) << "/" << max_tokens << ": '" << std::string(token_str, n_chars) << "' (id=" << next_token << ")" << std::endl;
            }
            
            // Instrument the token generation step
            std::string step_name = "token_generation_" + std::to_string(i);
            instr.begin_step(step_name, 0);
            
            // Log performance metrics
            instr.log_performance_metric("token_probability", top_tokens_with_probs[0].second, "probability");
            instr.log_performance_metric("token_logit", token_logits[0].second, "raw_logit");
            instr.log_performance_metric("model_layers", total_layers, "count");
            instr.log_performance_metric("vocab_size", vocab_size, "tokens");
            instr.flush(); // Force immediate write to disk
            
            // Prepare batch for next token
            llama_batch next_batch = llama_batch_init(1, 0, 1);
            next_batch.token[0] = next_token;
            next_batch.pos[0] = batch.n_tokens + i;
            next_batch.n_seq_id[0] = 1;
            next_batch.seq_id[0][0] = 0;
            next_batch.logits[0] = true;
            next_batch.n_tokens = 1;
            
            // Decode next token
            if (llama_decode(g_server_state.ctx, next_batch) != 0) {
                std::cerr << "❌ Failed to decode token " << i << std::endl;
                llama_batch_free(next_batch);
                break;
            }
            
            instr.end_step("Token generated: " + std::string(token_str, n_chars > 0 ? n_chars : 0));
            instr.flush(); // Force immediate write to disk
            all_tokens.push_back(next_token);
            
            llama_batch_free(next_batch);
        }
        
        // End instrumented session
        instr.end_session();
        
        // Free the batch
        llama_batch_free(batch);
        
        int generated_tokens = all_tokens.size() - prompt_tokens.size();
        std::cout << "✅ Inference complete for session: " << session_id << std::endl;
        std::cout << "📊 Prompt tokens: " << prompt_tokens.size() << std::endl;
        std::cout << "📊 Generated tokens: " << generated_tokens << std::endl;
        std::cout << "📊 Total tokens processed: " << all_tokens.size() << std::endl;
        std::cout << "📝 Generated text: " << generated_text << std::endl;
        
        // Store session info
        {
            std::lock_guard<std::mutex> session_lock(g_server_state.sessions_mutex);
            g_server_state.active_sessions[session_id] = log_path;
        }
        
        return log_path;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error during inference: " << e.what() << std::endl;
        return "";
    }
}

// Function to stream logs from a file
static std::string read_log_file(const std::string& file_path) {
    std::ifstream file(file_path);
    if (!file.is_open()) {
        return "";
    }
    
    std::stringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
}

// Function to read log file from a specific line offset (for streaming)
static std::vector<std::string> read_log_lines_from_offset(const std::string& file_path, size_t from_line = 0) {
    std::ifstream file(file_path);
    std::vector<std::string> lines;
    
    if (!file.is_open()) {
        return lines;
    }
    
    std::string line;
    size_t current_line = 0;
    
    while (std::getline(file, line)) {
        if (current_line >= from_line) {
            lines.push_back(line);
        }
        current_line++;
    }
    
    return lines;
}

int main(int /* argc */, char** /* argv */) {
    // Initialize logging
    // LLAMA_LOG_SET_VERBOSITY_THOLD(LLAMA_LOG_LEVEL_INFO);
    
    std::cout << "🚀 Starting Llama.cpp Monitoring Server..." << std::endl;
    
    // Load the model
    if (!load_model()) {
        std::cerr << "❌ Failed to load model. Exiting." << std::endl;
        return 1;
    }
    
    // Create HTTP server
    httplib::Server server;
    
    // Enable CORS
    server.set_pre_routing_handler([](const httplib::Request& /* req */, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
        return httplib::Server::HandlerResponse::Unhandled;
    });
    
    // Handle OPTIONS requests (CORS preflight)
    server.Options("/.*", [](const httplib::Request&, httplib::Response& /* res */) {
        return;
    });
    
    // Health check endpoint
    server.Get("/health", [](const httplib::Request&, httplib::Response& res) {
        json response;
        response["status"] = "ok";
        response["model_loaded"] = g_server_state.model_loaded.load();
        res.set_content(response.dump(), "application/json");
    });
    
    // Main log monitoring endpoint
    server.Post("/log-monitoring", [](const httplib::Request& req, httplib::Response& res) {
        try {
            // Parse JSON request
            json request_json = json::parse(req.body);
            
            if (!request_json.contains("prompt")) {
                json error_response;
                error_response["error"] = "Missing 'prompt' field in request body";
                res.status = 400;
                res.set_content(error_response.dump(), "application/json");
                return;
            }
            
            std::string prompt = request_json["prompt"];
            std::string session_id = generate_session_id();
            
            std::cout << "📥 Received request for session: " << session_id << std::endl;
            std::cout << "💭 Prompt: " << prompt << std::endl;
            
            // Run inference asynchronously and get log file path
            std::string log_file_path = run_inference_with_logs(prompt, session_id);
            
            if (log_file_path.empty()) {
                json error_response;
                error_response["error"] = "Failed to run inference";
                res.status = 500;
                res.set_content(error_response.dump(), "application/json");
                return;
            }
            
            // Wait a bit for logs to be written
            std::this_thread::sleep_for(std::chrono::milliseconds(500));
            
            // Read the log file
            std::string log_content = read_log_file(log_file_path);
            
            // Return response with session info and logs
            json response;
            response["session_id"] = session_id;
            response["log_file_path"] = log_file_path;
            response["logs"] = log_content;
            response["status"] = "completed";
            
            res.set_content(response.dump(), "application/json");
            
        } catch (const std::exception& e) {
            json error_response;
            error_response["error"] = "Invalid JSON or processing error";
            error_response["details"] = e.what();
            res.status = 400;
            res.set_content(error_response.dump(), "application/json");
        }
    });
    
    // Get logs by session ID endpoint
    server.Get("/logs/([^/]+)", [](const httplib::Request& req, httplib::Response& res) {
        std::string session_id = req.matches[1];
        
        std::lock_guard<std::mutex> lock(g_server_state.sessions_mutex);
        auto it = g_server_state.active_sessions.find(session_id);
        
        if (it == g_server_state.active_sessions.end()) {
            json error_response;
            error_response["error"] = "Session not found";
            res.status = 404;
            res.set_content(error_response.dump(), "application/json");
            return;
        }
        
        std::string log_content = read_log_file(it->second);
        
        json response;
        response["session_id"] = session_id;
        response["logs"] = log_content;
        
        res.set_content(response.dump(), "application/json");
    });

    // Streaming logs endpoint with offset support
    server.Get("/logs/([^/]+)/stream", [](const httplib::Request& req, httplib::Response& res) {
        std::string session_id = req.matches[1];
        
        // Get offset parameter (default 0)
        size_t from_line = 0;
        if (req.has_param("from_line")) {
            try {
                from_line = std::stoull(req.get_param_value("from_line"));
            } catch (const std::exception&) {
                from_line = 0;
            }
        }
        
        std::lock_guard<std::mutex> lock(g_server_state.sessions_mutex);
        auto it = g_server_state.active_sessions.find(session_id);
        
        if (it == g_server_state.active_sessions.end()) {
            json error_response;
            error_response["error"] = "Session not found";
            res.status = 404;
            res.set_content(error_response.dump(), "application/json");
            return;
        }
        
        std::vector<std::string> new_lines = read_log_lines_from_offset(it->second, from_line);
        
        json response;
        response["session_id"] = session_id;
        response["from_line"] = from_line;
        response["new_lines"] = new_lines;
        response["total_lines"] = from_line + new_lines.size();
        
        res.set_content(response.dump(), "application/json");
    });
    
    // List active sessions endpoint
    server.Get("/sessions", [](const httplib::Request&, httplib::Response& res) {
        std::lock_guard<std::mutex> lock(g_server_state.sessions_mutex);
        
        json response;
        response["active_sessions"] = json::array();
        
        for (const auto& [session_id, log_path] : g_server_state.active_sessions) {
            json session_info;
            session_info["session_id"] = session_id;
            session_info["log_file_path"] = log_path;
            response["active_sessions"].push_back(session_info);
        }
        
        res.set_content(response.dump(), "application/json");
    });
    
    // Start server
    const int port = 8080;
    std::cout << "🌐 Starting HTTP server on port " << port << "..." << std::endl;
    std::cout << "📍 Endpoints:" << std::endl;
    std::cout << "   POST /log-monitoring - Start inference with logs" << std::endl;
    std::cout << "   GET  /logs/{session_id} - Get logs for a session" << std::endl;
    std::cout << "   GET  /logs/{session_id}/stream?from_line=N - Stream logs from line N" << std::endl;
    std::cout << "   GET  /sessions - List active sessions" << std::endl;
    std::cout << "   GET  /health - Health check" << std::endl;
    
    if (!server.listen("0.0.0.0", port)) {
        std::cerr << "❌ Failed to start server on port " << port << std::endl;
        return 1;
    }
    
    return 0;
}
