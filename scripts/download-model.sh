#!/bin/bash
# Download the Qwen 2.5 0.5B quantized model for BudgetBuddy
MODEL_DIR="./models"
MODEL_URL="https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf"
MODEL_FILE="$MODEL_DIR/qwen2.5-0.5b-instruct-q4_k_m.gguf"

mkdir -p "$MODEL_DIR"

if [ -f "$MODEL_FILE" ]; then
  echo "Model already exists at $MODEL_FILE"
  exit 0
fi

echo "Downloading Qwen 2.5 0.5B Instruct (Q4_K_M)..."
echo "This is a ~400MB download."
curl -L -o "$MODEL_FILE" "$MODEL_URL"

echo "Download complete: $MODEL_FILE"
echo "Copy this file to your Android device at /sdcard/Android/data/com.budgetbuddy/files/models/"
