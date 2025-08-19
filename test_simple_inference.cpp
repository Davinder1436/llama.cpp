#include "llama.h"
#include "common.h"
#include <iostream>
#include <string>
#include <vector>

int main(int argc, char ** argv) {
    // Initialize dynamic backends
    ggml_backend_load_all();
    
    try {
        std::cout << "🔧 Initializing llama backend..." << std::endl;
        
        // Set up llama.cpp model parameters
        llama_model_params model_params = llama_model_default_params();
        
        // Load the Gemma-3 1B model
        std::cout << "📁 Loading model..." << std::endl;
        llama_model * model = llama_model_load_from_file("../downloads/gemma-3-1b-it-Q4_K_M.gguf", model_params);
        if (!model) {
            std::cerr << "❌ Failed to load model!" << std::endl;
            return 1;
        }
        
        // Get vocab
        const llama_vocab * vocab = llama_model_get_vocab(model);
        
        // Create context
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
        
        // Prepare the prompt
        std::string prompt = "What is the meaning of life? Answer in one sentence.";
        std::cout << "💭 Prompt: " << prompt << std::endl;
        
        // Tokenize the prompt
        const int n_prompt = -llama_tokenize(vocab, prompt.c_str(), prompt.size(), NULL, 0, true, true);
        std::vector<llama_token> prompt_tokens(n_prompt);
        llama_tokenize(vocab, prompt.c_str(), prompt.size(), prompt_tokens.data(), n_prompt, true, true);
        
        std::cout << "🔤 Tokenized prompt: " << n_prompt << " tokens" << std::endl;
        
        // Debug: print first few tokens
        std::cout << "🔍 First few tokens: ";
        for (int i = 0; i < std::min(5, n_prompt); ++i) {
            std::cout << prompt_tokens[i] << " ";
        }
        std::cout << std::endl;

        std::cout << "📦 Creating batch..." << std::endl;
        
        // Create batch with correct parameters (tokens, n_tokens)
        llama_batch batch = llama_batch_get_one(prompt_tokens.data(), n_prompt);
        
        std::cout << "📦 Batch created successfully" << std::endl;
        std::cout << "📊 Batch info: n_tokens=" << batch.n_tokens << ", logits=" << (batch.logits ? "yes" : "no") << std::endl;
        
        // Make sure logits are computed for the last token
        if (batch.logits) {
            batch.logits[batch.n_tokens - 1] = true;
            std::cout << "📊 Set logits flag for last token (position " << (batch.n_tokens - 1) << ")" << std::endl;
        }
        
        // Process the prompt
        std::cout << "🧠 Processing prompt..." << std::endl;
        if (llama_decode(ctx, batch) != 0) {
            std::cerr << "❌ Failed to decode prompt!" << std::endl;
            llama_free(ctx);
            llama_model_free(model);
            return 1;
        }
        std::cout << "✅ Prompt processed successfully!" << std::endl;
        
        // Generate a few tokens
        std::cout << "🤖 Generated response: ";
        std::cout.flush();
        
        int max_tokens = 10;  // Just a few tokens for testing
        
        for (int i = 0; i < max_tokens; i++) {
            std::cout << "🎯 Generation step " << i << std::endl;
            
            // Get logits for the last position (after processing prompt, we use the last token position)  
            int logits_pos = (i == 0) ? (n_prompt - 1) : 0;  // First iteration uses last prompt position, subsequent use position 0
            float * logits = llama_get_logits_ith(ctx, logits_pos);
            if (logits == nullptr) {
                std::cout << "❌ Failed to get logits from position " << logits_pos << "!" << std::endl;
                break;
            }
            
            std::cout << "✅ Got logits successfully!" << std::endl;
            
            // Simple greedy sampling
            llama_token next_token = 0;
            float max_logit = logits[0];
            int vocab_size = llama_vocab_n_tokens(vocab);
            for (llama_token token_id = 1; token_id < vocab_size; token_id++) {
                if (logits[token_id] > max_logit) {
                    max_logit = logits[token_id];
                    next_token = token_id;
                }
            }
            
            std::cout << "⚙️ Processing token " << next_token << std::endl;
            
            // Convert token to text
            std::vector<char> token_str(256);
            int n_chars = llama_token_to_piece(vocab, next_token, token_str.data(), token_str.size(), 0, true);
            if (n_chars < 0) {
                std::cout << "❌ Failed to convert token to text!" << std::endl;
                break;
            }
            
            // Print the token
            std::string token_text(token_str.data(), n_chars);
            std::cout << token_text;
            std::cout.flush();
            
            // Check for end of generation
            if (next_token == llama_vocab_eos(vocab)) {
                std::cout << std::endl << "🔚 End of generation (EOS token)" << std::endl;
                break;
            }
            
            // Prepare next token for processing
            llama_pos pos = prompt_tokens.size() + i;  // Current position in sequence
            llama_batch next_batch = llama_batch_get_one(&next_token, 1);
            next_batch.pos[0] = pos;        // Set position
            next_batch.seq_id[0][0] = 0;    // Set sequence ID
            next_batch.logits[0] = true;    // Get logits for next step
            
            // Process the next token
            if (llama_decode(ctx, next_batch) != 0) {
                std::cerr << std::endl << "❌ Failed to decode next token!" << std::endl;
                break;
            }
        }
        
        std::cout << std::endl << "✅ Test completed successfully!" << std::endl;
        
        // Cleanup
        llama_free(ctx);
        llama_model_free(model);
        
    } catch (const std::exception& e) {
        std::cerr << "💥 Exception: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
