#include "llama.h"
#include "llama-instrumentation.h"
#include "common.h"
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include <cmath>

int main(int argc, char ** argv) {
    // Initialize dynamic backends
    ggml_backend_load_all();
    
    try {
        // 1. Initialize instrumentation with DETAILED level
        std::cout << "🔧 Initializing llama backend..." << std::endl;
        
        // 1. Initialize the instrumentation system
        llama_instrumentation instr(llama_instr_level::VERBOSE, "gemma_inference_trace.log");
        instr.enable();
        
        // 2. Load the Gemma-3 1B model
        std::cout << "📚 Loading Gemma-3 1B model..." << std::endl;
        llama_model_params model_params = llama_model_default_params();
        model_params.n_gpu_layers = 0; // Use CPU for this test
        
        llama_model * model = llama_model_load_from_file("downloads/gemma-3-1b-it-Q4_K_M.gguf", model_params);
        if (!model) {
            std::cerr << "❌ Failed to load model!" << std::endl;
            return 1;
        }
        
        // 3. Get vocab
        const llama_vocab * vocab = llama_model_get_vocab(model);
        if (!vocab) {
            std::cerr << "❌ Failed to get vocabulary from model!" << std::endl;
            return 1;
        }
        std::cout << "📝 Vocabulary loaded successfully" << std::endl;
        
        // 4. Create context
        std::cout << "⚙️ Creating inference context..." << std::endl;
        llama_context_params ctx_params = llama_context_default_params();
        ctx_params.n_ctx = 512;      // Context length
        ctx_params.n_batch = 32;     // Batch size
        ctx_params.n_threads = 4;    // CPU threads
        
        llama_context * ctx = llama_init_from_model(model, ctx_params);
        if (!ctx) {
            std::cerr << "❌ Failed to create context!" << std::endl;
            llama_model_free(model);
            return 1;
        }
        
        // 5. Prepare the prompt
        std::string prompt = "what is the roadmap i can follow to learn AI/ML and get a decent job in it?";
        std::cout << "💭 Prompt: " << prompt << std::endl;
        
        // 6. Begin instrumented session
        std::cout << "📊 Starting instrumented inference test..." << std::endl;
        instr.begin_session(prompt, model);
        
        // 7. Tokenize the prompt
        const int n_prompt = -llama_tokenize(vocab, prompt.c_str(), prompt.length(), NULL, 0, true, true);
        std::vector<llama_token> prompt_tokens(n_prompt);
        llama_tokenize(vocab, prompt.c_str(), prompt.length(), prompt_tokens.data(), n_prompt, true, true);
        
        std::cout << "🔤 Tokenized prompt: " << n_prompt << " tokens" << std::endl;
        
        // Debug: print first few tokens
        std::cout << "🔍 First few tokens: ";
        for (int i = 0; i < std::min(5, n_prompt); ++i) {
            std::cout << prompt_tokens[i] << " ";
        }
        std::cout << std::endl;

        std::cout << "📦 Creating batch..." << std::endl;
        
        // 8. Create batch with all prompt tokens  
        llama_batch batch = llama_batch_init(n_prompt, 0, 1);
        
        // Add tokens to batch manually
        for (int i = 0; i < n_prompt; ++i) {
            batch.token[i] = prompt_tokens[i];
            batch.pos[i] = i;
            batch.n_seq_id[i] = 1;
            batch.seq_id[i][0] = 0;
            batch.logits[i] = (i == n_prompt - 1);  // Only compute logits for last token
        }
        batch.n_tokens = n_prompt;
        
        std::cout << "📦 Batch created successfully" << std::endl;
        std::cout << "📊 Batch info: n_tokens=" << batch.n_tokens << ", logits=" << (batch.logits ? "yes" : "no") << std::endl;
        
        // Make sure logits are computed for the last token
        batch.logits[batch.n_tokens - 1] = true;
        
        std::cout << "📊 Set logits flag for last token" << std::endl;
        
        // 9. Process the prompt (this will trigger our instrumentation)
        instr.begin_step("prompt_processing", 0);
        std::cout << "🧠 Processing prompt..." << std::endl;
        if (llama_decode(ctx, batch) != 0) {
            std::cerr << "❌ Failed to decode prompt!" << std::endl;
            return 1;
        }
        instr.end_step("Prompt processed successfully");
        std::cout << "✅ Prompt processed successfully!" << std::endl;
        
        // 10. Generate a few tokens
        std::cout << "🤖 Generated response: ";
        std::cout.flush();
        
        int max_tokens = 50;
        std::vector<llama_token> all_tokens = prompt_tokens;
        
        for (int i = 0; i < max_tokens; i++) {
            std::cout << "🎯 Generation step " << i << std::endl;
            
            // Get logits and sample next token - use the LAST token's logits (index -1)
            float * logits = llama_get_logits_ith(ctx, -1);  // -1 means last token with logits=true
            if (logits == nullptr) {
                std::cout << "❌ Failed to get logits!" << std::endl;
                break;
            }
            
            std::cout << "✅ Got logits successfully!" << std::endl;
            
            int vocab_size = llama_vocab_n_tokens(vocab);
            
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
            const int top_k = 10; // Show top 10 tokens
            
            // First, calculate softmax for top tokens
            float max_logit = token_logits[0].second;
            float sum_exp = 0.0f;
            
            // Calculate exp(logit - max_logit) for numerical stability
            for (int k = 0; k < std::min(top_k, (int)token_logits.size()); k++) {
                float exp_val = std::exp(token_logits[k].second - max_logit);
                sum_exp += exp_val;
                top_tokens_with_probs.push_back({token_logits[k].first, exp_val});
            }
            
            // Convert to probabilities
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
                int n_chars = 0;
                
                // Safe token to piece conversion
                if (vocab) {
                    n_chars = llama_token_to_piece(vocab, top_tokens_with_probs[k].first, token_str, sizeof(token_str), 0, true);
                }
                
                std::string token_text;
                if (n_chars > 0 && n_chars < sizeof(token_str)) {
                    token_text = std::string(token_str, n_chars);
                } else {
                    token_text = "<unk>";
                }
                sampling_state.top_token_texts.push_back(token_text);
                
                // Find the corresponding logit value
                bool found_logit = false;
                for (int j = 0; j < (int)token_logits.size(); j++) {
                    if (token_logits[j].first == top_tokens_with_probs[k].first) {
                        sampling_state.logits_sample.push_back(token_logits[j].second);
                        found_logit = true;
                        break;
                    }
                }
                if (!found_logit) {
                    sampling_state.logits_sample.push_back(0.0f);  // Default value
                }
            }
            
            // Add layer classification information (simulated for educational purposes)
            int total_layers = llama_model_n_layer(model);
            
            // Simulate layer-by-layer processing time (for educational visualization)
            for (int layer = 0; layer < total_layers; layer++) {
                llama_layer_info layer_info;
                layer_info.layer_id = layer;
                
                // Classify layer types based on typical transformer architecture
                if (layer % 2 == 0) {
                    layer_info.layer_type = "attention";
                    layer_info.operation = "multi_head_self_attention";
                } else {
                    layer_info.layer_type = "feed_forward"; 
                    layer_info.operation = "mlp_projection";
                }
                
                // Simulate layer execution time (educational approximation)
                layer_info.execution_time = std::chrono::microseconds(1000 + (layer * 50));
                
                // Add layer-specific metrics
                layer_info.layer_metrics["attention_heads"] = (layer_info.layer_type == "attention") ? 4.0 : 0.0;
                layer_info.layer_metrics["hidden_dim"] = 1152.0;
                layer_info.layer_metrics["intermediate_dim"] = (layer_info.layer_type == "feed_forward") ? 6912.0 : 0.0;
                
                sampling_state.layer_details.push_back(layer_info);
            }
            
            // Log the sampling state
            instr.log_sampling_state(sampling_state);
            
            // Select the greedy token (highest probability)
            llama_token next_token = top_tokens_with_probs[0].first;
            
            // Check for end of sequence
            if (next_token == llama_vocab_eos(vocab)) {
                std::cout << "🔚 End of sequence reached!" << std::endl;
                break;
            }
            
            // Convert token to text and print
            char token_str[256];
            int n_chars = llama_token_to_piece(vocab, next_token, token_str, sizeof(token_str), 0, true);
            if (n_chars > 0) {
                std::cout << std::string(token_str, n_chars);
                std::cout.flush();
            }
            
            // Instrument the token generation step with layer details
            std::string step_name = "token_generation_" + std::to_string(i);
            instr.begin_step(step_name, 0);
            
            // Log detailed layer information
            int n_layer = llama_model_n_layer(model);
            
            // Performance metric for this step
            instr.log_performance_metric("token_probability", top_tokens_with_probs[0].second, "probability");
            instr.log_performance_metric("token_logit", token_logits[0].second, "raw_logit");
            
            // Add custom metrics for layer count and model info
            instr.log_performance_metric("model_layers", n_layer, "count");
            instr.log_performance_metric("vocab_size", vocab_size, "tokens");
            
            // Prepare batch for next token  
            llama_batch next_batch = llama_batch_init(1, 0, 1);
            next_batch.token[0] = next_token;
            next_batch.pos[0] = batch.n_tokens + i;
            next_batch.n_seq_id[0] = 1;
            next_batch.seq_id[0][0] = 0;
            next_batch.logits[0] = true;
            next_batch.n_tokens = 1;
            
            std::cout << "⚙️ Processing token " << i << std::endl;
            
            // Decode next token (this triggers more instrumentation)
            if (llama_decode(ctx, next_batch) != 0) {
                instr.end_step("Decode failed");
                std::cout << "❌ Decode failed!" << std::endl;
                break;
            }
            
            instr.end_step("Token generated: " + std::string(token_str, n_chars > 0 ? n_chars : 0));
            all_tokens.push_back(next_token);
            
            // Free the batch
            llama_batch_free(next_batch);
        }
        
        std::cout << std::endl;
        
        // 11. End instrumented session
        instr.end_session();
        
        // 12. Free the allocated batches
        llama_batch_free(batch);
        
        // 13. Cleanup
        llama_free(ctx);
        llama_model_free(model);
        
        std::cout << "✅ Basic inference test complete!" << std::endl;
        std::cout << "📊 Total tokens processed: " << all_tokens.size() << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
