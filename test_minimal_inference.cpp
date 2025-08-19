#include "llama.h"
#include <iostream>
#include <vector>
#include <string>

int main(int argc, char** argv) {
    // Initialize llama backend
    llama_backend_init();
    
    // Load model
    llama_model_params model_params = llama_model_default_params();
    model_params.use_mmap = true;
    
    llama_model* model = llama_model_load_from_file("./downloads/gemma-3-1b-it-Q4_K_M.gguf", model_params);
    if (!model) {
        std::cerr << "❌ Failed to load model" << std::endl;
        return 1;
    }
    
    // Create context
    llama_context_params ctx_params = llama_context_default_params();
    ctx_params.n_ctx = 512;
    
    llama_context* ctx = llama_init_from_model(model, ctx_params);
    if (!ctx) {
        std::cerr << "❌ Failed to create context" << std::endl;
        llama_model_free(model);
        return 1;
    }
    
    // Simple test prompt
    std::string prompt = "Hello";
    
    // Get vocab from model
    const llama_vocab* vocab = llama_model_get_vocab(model);
    
    // Tokenize using vocab
    std::vector<llama_token> tokens(prompt.size() + 1);  // +1 for potential special tokens
    int n_tokens = llama_tokenize(vocab, prompt.c_str(), prompt.size(), tokens.data(), tokens.size(), true, true);
    if (n_tokens < 0) {
        tokens.resize(-n_tokens);
        n_tokens = llama_tokenize(vocab, prompt.c_str(), prompt.size(), tokens.data(), tokens.size(), true, true);
    }
    tokens.resize(n_tokens);
    
    std::cout << "✅ Tokenized '" << prompt << "' to " << n_tokens << " tokens" << std::endl;
    
    // Create and process batch
    llama_batch batch = llama_batch_get_one(tokens.data(), n_tokens);
    
    if (llama_decode(ctx, batch) != 0) {
        std::cerr << "❌ Failed to decode batch" << std::endl;
        llama_free(ctx);
        llama_model_free(model);
        return 1;
    }
    
    std::cout << "✅ Batch processed successfully!" << std::endl;
    
    // Get logits for the last token
    float* logits = llama_get_logits_ith(ctx, n_tokens - 1);
    if (!logits) {
        std::cerr << "❌ Failed to get logits" << std::endl;
        llama_free(ctx);
        llama_model_free(model);
        return 1;
    }
    
    std::cout << "✅ Got logits successfully!" << std::endl;
    
    // Just find the most likely token (greedy sampling)
    int vocab_size = llama_vocab_n_tokens(vocab);
    
    std::cout << "📊 Vocab size: " << vocab_size << std::endl;
    
    llama_token best_token = 0;
    float best_logit = logits[0];
    
    // Limit search to first 1000 tokens to avoid issues
    int search_limit = std::min(vocab_size, 1000);
    
    for (int i = 1; i < search_limit; i++) {
        if (logits[i] > best_logit) {
            best_logit = logits[i];
            best_token = i;
        }
    }
    
    std::cout << "🎯 Best token: " << best_token << " (logit: " << best_logit << ")" << std::endl;
    
    // Try to convert token to text
    std::cout << "🔄 Converting token to text..." << std::endl;
    
    std::vector<char> token_str(256);
    int n_chars = llama_token_to_piece(vocab, best_token, token_str.data(), token_str.size(), 0, true);
    
    if (n_chars < 0) {
        std::cout << "⚠️ Token conversion failed with code: " << n_chars << std::endl;
    } else {
        std::string token_text(token_str.data(), n_chars);
        std::cout << "✅ Token text: '" << token_text << "'" << std::endl;
    }
    
    std::cout << "🎉 Test completed successfully!" << std::endl;
    
    // Cleanup
    llama_free(ctx);
    llama_model_free(model);
    llama_backend_free();
    
    return 0;
}
