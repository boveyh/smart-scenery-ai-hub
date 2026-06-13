#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
一键生成 .env 配置文件
运行: python setup_env.py
"""
import os
import sys

# 设置 stdout 编码为 utf-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

env_content = """# ============================================================
# 智慧景区 AI 导览系统 - AI 引擎配置文件
# ============================================================

# --- 服务配置 ---
SERVER_HOST=0.0.0.0
SERVER_PORT=8000

# --- 大语言模型 (DeepSeek) ---
LLM_API_KEY=YOUR_DEEPSEEK_API_KEY_HERE
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_MAX_TOKENS=2048
LLM_TEMPERATURE=0.7

# --- 语音合成 (阿里云 CosyVoice TTS) ---
TTS_API_KEY=YOUR_TTS_API_KEY_HERE
TTS_MODEL=cosyvoice-v3.5-plus
TTS_VOICE=loopy

# --- TTS 音频输出目录 ---
TTS_OUTPUT_DIR=./static/audio

# --- Java 后端地址 ---
BACKEND_BASE_URL=http://localhost:9000
"""

env_path = os.path.join(os.path.dirname(__file__), ".env")
with open(env_path, "w", encoding="utf-8") as f:
    f.write(env_content)

print("[OK] 配置文件已生成: " + env_path)
print()
print("配置概览:")
print("  LLM API Key:     YOUR_DEEPSEEK_API_KEY_HERE (DeepSeek)")
print("  TTS API Key:     YOUR_TTS_API_KEY_HERE (阿里云 CosyVoice)")
print("  TTS 模型:        cosyvoice-v3.5-plus")
print("  TTS 音色:        loopy")
print("  Java 后端地址:   http://localhost:9000")
print()
print("现在运行: uvicorn main:app --reload --port 8000")
