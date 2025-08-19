#include <iostream>
#include <vector>
#include <string>

#include "llama.h"
#include "common/common.h"

int main() {
    try {
        std::cout << "🔧 Initializing llama backend..." << std::endl;
        llama_model_params model_params = llama_model_default_params();
        
        std::cout << "📁 Loading model..." << std::endl;
        auto model = llama_model_load_from_file("../downloads/gemma-3-1b-it-Q4_K_M.gguf", model_params);
        if (!model) {
            std::cerr << "❌ Failed to load model!" << std::endl;
            return 1;
        }
        
        std::cout << "✅ Model loaded successfully" << std::endl;
        
        std::cout << "⚙️ Creating inference context..." << std::endl;
        llama_context_params ctx_params = llama_context_default_params();
        ctx_params.n_ctx = 512;
        ctx_params.n_batch = 64;
        
        auto ctx = llama_init_from_model(model, ctx_params);
        if (!ctx) {
            std::cerr << "❌ Failed to create context!" << std::endl;
            llama_model_free(model);
            return 1;
        }
        
        std::cout << "✅ Context created successfully" << std::endl;
        
        std::cout << "📝 Testing tokenization..." << std::endl;
        const llama_vocab* vocab = llama_model_get_vocab(model);
        std::string prompt = "Hello world!";
        
        // Tokenize the prompt
        const int n_prompt = -llama_tokenize(vocab, prompt.c_str(), prompt.size(), NULL, 0, true, true);
        std::vector<llama_token> prompt_tokens(n_prompt);
        llama_tokenize(vocab, prompt.c_str(), prompt.size(), prompt_tokens.data(), n_prompt, true, true);
        
        std::cout << "🔤 Tokenized " << n_prompt << " tokens successfully" << std::endl;
        
        std::cout << "🧠 Testing decode..." << std::endl;
        
        // Create batch with all prompt tokens
        llama_batch batch = llama_batch_get_one(prompt_tokens.data(), n_prompt);
        batch.logits[batch.n_tokens - 1] = true;
        
        // Process the prompt
        if (llama_decode(ctx, batch) != 0) {
            std::cerr << "❌ Failed to decode prompt!" << std::endl;
            return 1;
        }
        
        std::cout << "✅ Decode successful!" << std::endl;
        
        std::cout << "🎯 Testing logits access..." << std::endl;
        float * logits = llama_get_logits_ith(ctx, batch.n_tokens - 1);
        if (logits == nullptr) {
            std::cerr << "❌ Failed to get logits!" << std::endl;
            return 1;
        }
        
        std::cout << "✅ Logits access successful!" << std::endl;
        
        // Cleanup
        llama_free(ctx);
        llama_model_free(model);
        
        std::cout << "✅ All tests passed!" << std::endl;
        return 0;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
}
