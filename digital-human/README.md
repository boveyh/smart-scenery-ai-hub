# 🎭 数字人模块 — Wav2Lip 集成

> **架构原则**：本模块与 AI 引擎（`ai-engine-python/`）完全解耦，独立运行。
> AI 引擎遵循"零 GPU"原则，Wav2Lip 仅在本地 GPU 机器上运行。

## 三种使用方式

| 脚本 | 用途 | 场景 |
|------|------|------|
| **`full_pipeline.py`** | AI 生成文本 → TTS → Wav2Lip → 窗口播放 | **答辩全程演示** |
| `pre_generate.py` | 离线生成 idle.mp4 + speaking.mp4 | 给前端小程序提供预录素材 |
| `realtime_demo.py` | 麦克风录音 → 实时唇形同步 | 答辩"实时性"加分展示 |

### 方式 1：全自动 AI 数字人（推荐）

```
你输入问题 → LLM 流式生成回答 → 句级切片
    → edge-tts 逐句合成语音 → Wav2Lip 生成唇形同步帧 → OpenCV 窗口播放
```

### 方式 2：离线预生成（主线方案）

```
你的照片 + TTS 音频 → Wav2Lip → idle.mp4 + speaking.mp4
                                         ↓
                         放入 frontend-mp/assets/video/
                                         ↓
                     前端 onPlay/onEnded 切换播放
```

### 方式 3：实时 Demo（答辩加分）

```
麦克风/音频文件 → Wav2Lip 实时推理 → 窗口显示数字人说话
```

---

## 环境要求

| 项目 | 要求 |
|------|------|
| GPU | NVIDIA 显卡，≥4GB 显存 |
| Python | 3.11（uv 自动下载） |
| 磁盘 | ≥10GB（含 PyTorch + 模型权重） |

---

## 快速开始

### 1️⃣ 克隆 Wav2Lip 源码

```bash
cd digital-human
git clone https://github.com/Rudrabha/Wav2Lip.git wav2lip-src
```

### 2️⃣ 安装依赖（uv 一键完成）

```bash
cd digital-human
uv sync
```

uv 会自动下载 Python 3.11 + PyTorch CUDA 版 + 全部 75 个依赖包。

### 3️⃣ 下载预训练模型

**s3fd.pth（人脸检测，278KB）：**

```bash
# 放入 face_detection/detection/sfd/ 目录
# 下载地址：https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth
```

来源：[face-alignment 开源项目](https://github.com/1adrianb/face-alignment) 官方下载页。

**wav2lip_gan.pth（唇形同步主模型，~400MB）：**

> 打开 → https://drive.google.com/file/d/15G3U08c8xsCkOqQxE38Z2XXDnPcOptNk/view
> 下载 → 放入 `wav2lip-src/checkpoints/wav2lip_gan.pth`

来源：[Wav2Lip 官方 README](https://github.com/Rudrabha/Wav2Lip) 第 237-243 行 "Getting the weights" 表格。

### 4️⃣ 验证部署

```bash
cd digital-human
.venv\Scripts\python.exe -c "import torch; print('CUDA:', torch.cuda.is_available())"
# 应输出 CUDA: True
```

### 5️⃣ 启动全自动数字人

```bash
cd digital-human

# 确保 ai-engine-python/.env 已填写 LLM_API_KEY
.venv\Scripts\python.exe full_pipeline.py --face "你的照片.png" --tenant west_lake
```

在终端输入问题 → 回车 → 数字人在窗口中说话回答。

---

## 完整数据流

```
┌─────────────────────────────────────────────────────────┐
│ full_pipeline.py （全自动闭环）                          │
│                                                         │
│  游客提问                                               │
│     │                                                   │
│     ▼                                                   │
│  RAG 检索 ─→ 构建 System Prompt                        │
│     │     (ai-engine-python/core/rag_processor.py)      │
│     ▼                                                   │
│  LLM 流式生成 + 句级切片                                │
│     │     (ai-engine-python/core/llm_client.py)         │
│     ▼                                                   │
│  ┌─ 逐句循环 ──────────────────────────┐               │
│  │                                      │               │
│  │  edge-tts → 生成 WAV 音频            │               │
│  │        │                             │               │
│  │        ▼                             │               │
│  │  Wav2Lip 推理 → 唇形同步帧（GPU）     │               │
│  │        │                             │               │
│  │        ▼                             │               │
│  │  OpenCV 窗口播放 + 字幕              │               │
│  │                                      │               │
│  └─────────────────────────────────────┘               │
│     ▼                                                   │
│  播完回到待机，等待下一个问题                             │
└─────────────────────────────────────────────────────────┘
```

---

## 与主项目的配合

| 模块 | 环境 | 职责 |
|------|------|------|
| `ai-engine-python/` | `uv` / Python 3.11 | FastAPI 服务，LLM + TTS + NDJSON |
| `digital-human/` | `uv` / Python 3.11 + CUDA | Wav2Lip 数字人渲染 |
| `backend-java/` | Java + Maven | 微服务基座、ES 知识库、WebSocket |
| `frontend-mp/` | 微信小程序 | 游客交互舱 |

**生产环境**：AI 引擎通过 FastAPI `/api/v1/digitalhuman/chat` 输出 NDJSON 流式音频 URL，前端用 `<video>` 播放 `idle.mp4`/`speaking.mp4`。

**答辩演示**：`full_pipeline.py` 串起全链路，一个窗口展示 AI 自主对话 + 唇形同步效果。