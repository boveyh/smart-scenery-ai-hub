#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
一键生成 .env 配置文件

运行: python setup_env.py

注意：请先设置环境变量 LLM_API_KEY，或运行后手动编辑 .env 文件补全 Key。
"""

import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# 从环境变量读取（如果没有则留空占位）
llm_api_key = os.environ.get("LLM_API_KEY", "YOUR_DEEPSEEK_API_KEY_HERE")

env_content = f"""# ============================================================
# 智慧景区 AI 导览系统 - AI 引擎配置文件
# ============================================================

# --- 服务配置 ---
SERVER_HOST=0.0.0.0
SERVER_PORT=8000

# --- 大语言模型 (DeepSeek) ---
LLM_API_KEY={llm_api_key}
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat
LLM_MAX_TOKENS=2048
LLM_TEMPERATURE=0.7

# --- TTS 音频输出目录 (edge-tts，无需 API Key) ---
TTS_OUTPUT_DIR=./static/audio

# --- Java 后端地址 ---
BACKEND_BASE_URL=http://localhost:9000
"""

env_path = os.path.join(os.path.dirname(__file__), ".env")
with open(env_path, "w", encoding="utf-8") as f:
    f.write(env_content)

print("[OK] 配置文件已生成: " + env_path)
print()
print("请检查 .env 文件，补全 LLM_API_KEY（如果尚未设置）")
print("  - 已通过环境变量读取 Key: 是" if llm_api_key != "YOUR_DEEPSEEK_API_KEY_HERE" else "  - 请在 .env 中填入你的 DeepSeek API Key")
print()
print("启动服务: uvicorn main:app --reload --port 8000")
