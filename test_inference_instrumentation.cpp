#include "llama.h"
#include "llama-instrumentation.h"
#include "common.h"
#include <iostream>
#include <string>
#include <vector>

int main(int argc, char ** argv) {
    // Initialize dynamic backends
    ggml_backend_load_all();
    
    try {
        // 1. Initialize instrumentation with DETAILED level
        std::cout << "🔧 Initializing llama backend..." << std::endl;
        
        // 1. Initialize the instrumentation system
        llama_instrumentation instr(llama_instr_level::DETAILED, "gemma_inference_trace.log");
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
        std::string prompt = "What is machine learning?";
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
        
        // Add tokens to batch using the common helper
        for (int i = 0; i < n_prompt; ++i) {
            bool compute_logits = (i == n_prompt - 1);  // Only compute logits for last token
            common_batch_add(batch, prompt_tokens[i], i, {0}, compute_logits);
        }
        
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
            
            // Simple greedy sampling for demonstration
            llama_token next_token = 0;
            float max_logit = logits[0];
            int vocab_size = llama_vocab_n_tokens(vocab);
            for (llama_token token_id = 1; token_id < vocab_size; token_id++) {
                if (logits[token_id] > max_logit) {
                    max_logit = logits[token_id];
                    next_token = token_id;
                }
            }
            
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
            
            // Instrument the token generation step
            std::string step_name = "token_generation_" + std::to_string(i);
            instr.begin_step(step_name, 0);
            
            // Prepare batch for next token  
            llama_batch next_batch = llama_batch_init(1, 0, 1);
            common_batch_add(next_batch, next_token, batch.n_tokens + i, {0}, true);
            
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
