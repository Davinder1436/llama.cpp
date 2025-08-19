Build command :  g++ -std=c++17 -I./include -I./common -I./src -I./ggml/include -L./build/bin -L./build/common -Wl,-rpath,./build/bin test_inference_instrumentation.cpp ./build/common/libcommon.a -o test_inference -lllama -lggml -lggml-cpu -lggml-base

