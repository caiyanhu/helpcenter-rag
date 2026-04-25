#!/bin/sh
set -e

MODELS="bge-m3 qwen3:4b"

ollama serve &
PID=$!

sleep 2
until ollama list >/dev/null 2>&1; do
  sleep 1
done

for MODEL in $MODELS; do
  if ! ollama list | grep -q "^${MODEL}"; then
    echo "[ollama-entrypoint] Model ${MODEL} not found, pulling..."
    ollama pull "${MODEL}"
    echo "[ollama-entrypoint] Model ${MODEL} ready"
  else
    echo "[ollama-entrypoint] Model ${MODEL} already present, skipping pull"
  fi
done

wait "$PID"
