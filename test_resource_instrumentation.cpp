#include "include/llama.h"
#include "src/llama-instrumentation.h"
#include "include/llama-resource-instrumentation.h"
#include "common/common.h"
#include <iostream>
#include <string>
#include <vector>

int main(int argc, char ** argv) {
    // Initialize dynamic backends
    ggml_backend_load_all();
    
    try {
        std::cout << "🔧 Testing Resource Instrumentation System..." << std::endl;
        
        // 1. Initialize BOTH instrumentation systems
        std::cout << "📊 Initializing instrumentation systems..." << std::endl;
        
        // Original instrumentation
        llama_instrumentation instr(llama_instr_level::DETAILED, "test_token_trace.log");
        instr.enable();
        
        // NEW Resource instrumentation 
        llama_resource_instrumentation_init(llama_resource_level::DETAILED, "test_resource_trace.jsonl");
        
        // 2. Load the model
        std::cout << "📚 Loading model..." << std::endl;
        llama_model_params model_params = llama_model_default_params();
        model_params.n_gpu_layers = 0;
        
        llama_model * model = llama_model_load_from_file("downloads/gemma-3-1b-it-Q4_K_M.gguf", model_params);
        if (!model) {
            std::cerr << "❌ Failed to load model!" << std::endl;
            return 1;
        }
        
        // 3. Create context
        llama_context_params ctx_params = llama_context_default_params();
        ctx_params.n_ctx = 256;
        ctx_params.n_batch = 16;
        ctx_params.n_threads = 2;
        
        llama_context * ctx = llama_init_from_model(model, ctx_params);
        if (!ctx) {
            std::cerr << "❌ Failed to create context!" << std::endl;
            llama_model_free(model);
            return 1;
        }
        
        // 4. Begin instrumented session for BOTH systems
        std::string prompt = "Hello what is deep learning?";
        std::cout << "💭 Prompt: " << prompt << std::endl;
        
        // Token-level session
        instr.begin_session(prompt, model);
        
        // Resource-level session  
        LLAMA_RESOURCE_BEGIN_SESSION("test_resource_session_20240823_140000_123456");
        
        // 5. Tokenize
        const llama_vocab * vocab = llama_model_get_vocab(model);
        const int n_prompt = -llama_tokenize(vocab, prompt.c_str(), prompt.length(), NULL, 0, true, true);
        std::vector<llama_token> prompt_tokens(n_prompt);
        llama_tokenize(vocab, prompt.c_str(), prompt.length(), prompt_tokens.data(), n_prompt, true, true);
        
        std::cout << "🔤 Tokenized: " << n_prompt << " tokens" << std::endl;
        
        // 6. Process with BOTH instrumentations active
        int n_layers = llama_model_n_layer(model);
        std::cout << "🧠 Processing through " << n_layers << " layers..." << std::endl;
        
        // Simulate layer-by-layer processing with resource tracking
        for (int layer = 0; layer < std::min(3, n_layers); layer++) {  // Just first 3 layers for demo
            std::cout << "🔄 Processing layer " << layer << std::endl;
            
            // Begin resource tracking for this layer
            LLAMA_RESOURCE_BEGIN_LAYER(layer);
            
            // Simulate attention component
            LLAMA_RESOURCE_BEGIN_COMPONENT("attention");
            
            // Log simulated memory allocation for attention weights
            // NOTE: In a real integration, you'd pass actual tensor pointers
            // For this test, we'll create fake tensor data to demonstrate API usage
            
            // Simulate Q, K, V weight loading
            std::cout << "  💾 Simulating QKV weight allocation..." << std::endl;
            // LLAMA_RESOURCE_LOG_MEMORY_ALLOCATION(qkv_tensor, "qkv_weights");
            
            // Simulate attention computation
            std::cout << "  ⚡ Simulating attention computation..." << std::endl;
            // LLAMA_RESOURCE_LOG_COMPUTE_OPERATION("mul_mat", "attention", inputs, output);
            
            LLAMA_RESOURCE_END_COMPONENT("attention");
            
            // Simulate MLP component  
            LLAMA_RESOURCE_BEGIN_COMPONENT("mlp");
            
            std::cout << "  🧮 Simulating MLP operations..." << std::endl;
            // LLAMA_RESOURCE_LOG_MLP_OPERATION("gate_proj", gate_weights, gate_activations);
            // LLAMA_RESOURCE_LOG_MLP_OPERATION("up_proj", up_weights, up_activations);
            // LLAMA_RESOURCE_LOG_MLP_OPERATION("down_proj", down_weights, down_activations);
            
            // Log component data transfer
            LLAMA_RESOURCE_LOG_COMPONENT_HANDOFF("attention", "mlp");
            
            LLAMA_RESOURCE_END_COMPONENT("mlp");
            
            // End layer processing
            LLAMA_RESOURCE_END_LAYER(layer);
        }
        
        // 7. Create and process batch (minimal for demo)
        llama_batch batch = llama_batch_init(std::min(8, n_prompt), 0, 1);
        
        int tokens_to_process = std::min(8, n_prompt);
        for (int i = 0; i < tokens_to_process; ++i) {
            batch.token[i] = prompt_tokens[i];
            batch.pos[i] = i;
            batch.n_seq_id[i] = 1;
            batch.seq_id[i][0] = 0;
            batch.logits[i] = (i == tokens_to_process - 1);
        }
        batch.n_tokens = tokens_to_process;
        
        // Process with token-level instrumentation
        instr.begin_step("batch_processing", 0);
        
        std::cout << "🧠 Processing batch..." << std::endl;
        if (llama_decode(ctx, batch) == 0) {
            std::cout << "✅ Batch processed successfully!" << std::endl;
            
            // Log some performance metrics
            instr.log_performance_metric("batch_size", tokens_to_process, "tokens");
            instr.log_performance_metric("layers_processed", n_layers, "count");
        } else {
            std::cout << "❌ Batch processing failed!" << std::endl;
        }
        
        instr.end_step("Batch processing complete");
        
        // 8. End both instrumentation sessions
        instr.end_session();
        LLAMA_RESOURCE_END_SESSION();
        
        // 9. Cleanup
        llama_batch_free(batch);
        llama_free(ctx);
        llama_model_free(model);
        llama_resource_instrumentation_free();
        
        std::cout << "✅ Resource Instrumentation Test Complete!" << std::endl;
        std::cout << "📊 Check logs:" << std::endl;
        std::cout << "   - Token-level: test_token_trace.log" << std::endl;
        std::cout << "   - Resource-level: test_resource_trace.jsonl" << std::endl;
        
    } catch (const std::exception& e) {
        std::cerr << "❌ Error: " << e.what() << std::endl;
        return 1;
    }
    
    return 0;
}
