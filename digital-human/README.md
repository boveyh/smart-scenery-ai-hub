# 🎭 数字人模块 — Wav2Lip + SadTalker 组合方案

> **架构原则**：本模块与 AI 引擎（`ai-engine-python/`）完全解耦，独立运行。
> AI 引擎遵循"零 GPU"原则，数字人推理仅在本地 GPU 机器上运行。

## 🏗️ 组合方案架构

```
┌──────────────────────────────────────────────────────────────────┐
│                    🎭 Wav2Lip + SadTalker 组合数字人              │
│                                                                  │
│   输入: face.jpg + audio.wav                                      │
│          │                                                        │
│          │    ┌─────────────────────────────────────────┐        │
│          ├───→│  SadTalker（面部动态表情引擎）             │        │
│          │    │  · 3D 人脸重建（3DMM）                   │        │
│          │    │  · 头部姿态生成（点头、转头）            │        │
│          │    │  · 表情驱动（眨眼、眉毛、微表情）        │        │
│          │    │  · 输出: 256/512 面部动态帧序列          │        │
│          │    └─────────────────────────────────────────┘        │
│          │                                                        │
│          │    ┌─────────────────────────────────────────┐        │
│          └───→│  Wav2Lip（口型同步引擎）                  │        │
│               │  · Mel-spectrogram 音频特征提取           │        │
│               │  · GAN 生成精准唇形                      │        │
│               │  · 输出: 96×96 唇形同步帧                │        │
│               └─────────────────────────────────────────┘        │
│          │                                                        │
│          ▼                                                        │
│    ┌──────────────────────────────────────────────────────┐      │
│    │  唇形融合（Lip Region Blending）                      │      │
│    │  · 椭圆羽化 mask → 无缝拼接                          │      │
│    │  · 嘴部区域 (55%~95%) 替换为 Wav2Lip 输出            │      │
│    │  · 上2/3面部保留 SadTalker 动态                      │      │
│    └──────────────────────────────────────────────────────┘      │
│          │                                                        │
│          ▼                                                        │
│   输出: combined_output.mp4                                       │
│   ✅ 精准口型 + 自然面部动态 + 头部姿态 + 眨眼                    │
└──────────────────────────────────────────────────────────────────┘
```

## 📂 文件清单

| 文件 | 用途 | 场景 |
|------|------|------|
| **`combined_pipeline.py`** | **Wav2Lip+SadTalker 组合流水线** | **主线方案 ⭐** |
| `full_pipeline.py` | Wav2Lip-Only AI 数字人 | 仅有口型同步 |
| `pre_generate.py` | 离线预生成 idle.mp4 + speaking.mp4 | 前端素材预录 |
| `realtime_demo.py` | 麦克风实时唇形 | 答辩加分项 |
| `sadtalker_engine.py` | SadTalker 独立推理引擎 | SDK 调用 |
| `setup_wav2lip.ps1` | Wav2Lip 一键部署 | 首次运行 |
| `setup_sadtalker.ps1` | SadTalker 一键部署 | 首次运行 |

## 🚀 快速开始

### 环境要求

| 项目 | 要求 |
|------|------|
| GPU | NVIDIA 显卡，≥8GB 显存（双模型同时加载） |
| Python | 3.11（uv 自动管理） |
| 磁盘 | ≥20GB（PyTorch + 两套模型权重） |
| 网络 | 首次需下载 ~3GB 权重文件 |

### 1️⃣ 克隆源码

```bash
cd digital-human

# Wav2Lip（已有可跳过）
git clone https://github.com/Rudrabha/Wav2Lip.git wav2lip-src

# SadTalker
git clone https://github.com/OpenTalker/SadTalker.git sadtalker-src
```

### 2️⃣ 安装依赖

```bash
cd digital-human
uv sync
```

uv 自动下载 Python 3.11 + PyTorch CUDA + 全部依赖包（40+ 个）。

### 3️⃣ 下载预训练权重

> 📍 **权重文件位置详见下方「权重文件位置」章节**

**Wav2Lip 权重（~400MB）：**
```
wav2lip-src/checkpoints/wav2lip_gan.pth      ← 主模型
wav2lip-src/face_detection/detection/sfd/s3fd.pth  ← 人脸检测
```

**SadTalker 权重（~2.5GB）：**
```
sadtalker-src/checkpoints/
├── SadTalker_V0.0.2_256.safetensors          ← 主模型（必选）
├── SadTalker_V0.0.2_512.safetensors          ← 高分辨率（可选）
├── mapping_00109-model.pth.tar               ← 3D 映射
├── mapping_00229-model.pth.tar               ← 3D 映射 v2
└── facevid2vid_00189-model.pth.tar           ← 面部动态生成
```

### 4️⃣ 验证环境

```bash
cd digital-human
.venv\Scripts\python.exe -c "import torch; print('CUDA:', torch.cuda.is_available())"
# 应输出 CUDA: True

# 检查权重
.venv\Scripts\python.exe combined_pipeline.py --face "test.jpg" --help
# 会打印权重检查结果
```

### 5️⃣ 启动组合数字人

```bash
cd digital-human

# 离线生成视频（照片 + 音频 → 说话人像视频）
.venv\Scripts\python.exe combined_pipeline.py ^
    --face "photo.jpg" ^
    --audio "speech.wav" ^
    --output "demo.mp4" ^
    --preview

# 交互式 AI 数字人（接入 LLM + RAG）
.venv\Scripts\python.exe combined_pipeline.py ^
    --face "photo.jpg" ^
    --interactive ^
    --tenant west_lake
```

---

## 🎯 三种使用方式

| 脚本 | 用途 | SadTalker | Wav2Lip | 场景 |
|------|------|-----------|---------|------|
| **`combined_pipeline.py`** | 组合方案（推荐） | ✅ 面部动态 | ✅ 口型同步 | **主线** |
| `full_pipeline.py` | Wav2Lip-Only | ❌ | ✅ | 快速演示 |
| `pre_generate.py` | 离线预生成 | ❌ | ✅ | 前端素材 |

### 方式 1：组合方案（推荐 ⭐）

```
你输入问题 → LLM 流式生成回答 → 句级切片
    → edge-tts 逐句合成语音
    → SadTalker 生成面部动态帧（眨眼、头部姿态、表情）
    → Wav2Lip 生成精准唇形帧
    → 唇形融合（嘴部替换）
    → OpenCV 窗口播放完整数字人
```

启动：
```bash
.venv\Scripts\python.exe combined_pipeline.py --face "photo.jpg" --interactive --tenant west_lake
```

### 方式 2：离线生成视频

```bash
# 需要提前准备好 TTS 音频文件（16kHz WAV）
.venv\Scripts\python.exe combined_pipeline.py ^
    --face "photo.jpg" ^
    --audio "speech.wav" ^
    --output "output.mp4" ^
    --size 256 ^
    --blend feather
```

### 方式 3：Wav2Lip-Only（降级方案）

```bash
.venv\Scripts\python.exe full_pipeline.py --face "photo.jpg" --tenant west_lake
```

---

## 📍 权重文件位置

### Wav2Lip 权重

| 文件 | 路径 | 大小 | 来源 |
|------|------|------|------|
| wav2lip_gan.pth | `wav2lip-src/checkpoints/wav2lip_gan.pth` | ~400MB | [Google Drive](https://drive.google.com/file/d/15G3U08c8xsCkOqQxE38Z2XXDnPcOptNk/view) |
| s3fd.pth | `wav2lip-src/face_detection/detection/sfd/s3fd.pth` | ~50MB | [Adrian Bulat](https://www.adrianbulat.com/downloads/python-fan/s3fd-619a316812.pth) |

### SadTalker 权重

| 文件 | 路径 | 大小 | 必选 | 来源 |
|------|------|------|------|------|
| SadTalker_V0.0.2_256.safetensors | `sadtalker-src/checkpoints/` | ~1.2GB | ✅ 是 | [HuggingFace](https://huggingface.co/vinthony/SadTalker/resolve/main/SadTalker_V0.0.2_256.safetensors) |
| SadTalker_V0.0.2_512.safetensors | `sadtalker-src/checkpoints/` | ~1.2GB | 可选 | [HuggingFace](https://huggingface.co/vinthony/SadTalker/resolve/main/SadTalker_V0.0.2_512.safetensors) |
| mapping_00109-model.pth.tar | `sadtalker-src/checkpoints/` | ~120MB | ✅ 是 | [HuggingFace](https://huggingface.co/vinthony/SadTalker/resolve/main/mapping_00109-model.pth.tar) |
| mapping_00229-model.pth.tar | `sadtalker-src/checkpoints/` | ~120MB | ✅ 是 | [HuggingFace](https://huggingface.co/vinthony/SadTalker/resolve/main/mapping_00229-model.pth.tar) |
| facevid2vid_00189-model.pth.tar | `sadtalker-src/checkpoints/` | ~350MB | ✅ 是 | [HuggingFace](https://huggingface.co/vinthony/SadTalker/resolve/main/facevid2vid_00189-model.pth.tar) |

### 面部增强（可选）

| 文件 | 路径 | 大小 | 来源 |
|------|------|------|------|
| GFPGANv1.3.pth | `sadtalker-src/gfpgan/weights/` | ~350MB | [GFPGAN Releases](https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.3.pth) |
| detection_Resnet50_Final.pth | `sadtalker-src/gfpgan/weights/` | ~100MB | [FaceXLib](https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth) |
| parsing_parsenet.pth | `sadtalker-src/gfpgan/weights/` | ~80MB | [FaceXLib](https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth) |

> 💡 **一键下载**：运行 `setup_wav2lip.ps1` 和 `setup_sadtalker.ps1` 会给出详细下载指引。

---

## 🔧 CLI 参数说明

### combined_pipeline.py

```
--face PATH              人脸照片路径（必填）
--audio PATH             驱动音频 .wav 路径（离线模式）
--output PATH            输出 .mp4 路径
--interactive            交互式 AI 模式
--tenant ID              租户 ID（交互模式默认 west_lake）
--preview                实时预览窗口
--size INT               输出分辨率（默认 256，可选 512）
--fps INT                帧率（默认 25）
--blend METHOD           融合方法: poisson / feather / direct（默认 feather）
--still                  减少头部运动
--expression-scale FLOAT 表情强度 0.5-1.5（默认 1.0）
```

### sadtalker_engine.py（独立使用）

```bash
.venv\Scripts\python.exe sadtalker_engine.py \
    --face "photo.jpg" \
    --audio "speech.wav" \
    --output "sadtalker_only.mp4" \
    --size 256 \
    --expression-scale 1.0
```

---

## 🎨 唇形融合方法对比

| 方法 | 速度 | 效果 | 适用场景 |
|------|------|------|----------|
| **feather**（推荐） | 快 | 边界平滑 | 实时交互 |
| **poisson** | 慢 | 最自然 | 离线高质量输出 |
| **direct** | 最快 | 可能可见边界 | 预览/调试 |

---

## 📊 性能参考

| 场景 | GPU | 耗时（3秒音频） |
|------|-----|----------------|
| SadTalker + Wav2Lip 完整组合 | RTX 3060 12GB | ~8-12s |
| Wav2Lip-Only | RTX 3060 12GB | ~3-5s |
| SadTalker-Only | RTX 3060 12GB | ~6-8s |
| **降级模式**（CPU） | 任意 | ~30-60s |

---

## 🐛 故障降级策略

组合引擎设计了完善的降级策略：

```
SadTalker 权重缺失 → 使用 Wav2Lip-Only（仅有口型，无面部动态）
Wav2Lip 权重缺失 → 使用 SadTalker-Only（仅有面部动态，口型不准）
全部缺失      → 返回静态照片序列（占位模式）
GPU 不可用     → 自动降级 CPU（慢但可用）
Poisson 融合不可用 → 自动降级 Feather 融合
imageio 不可用 → 自动降级 OpenCV VideoWriter
TTS 失败       → 使用静音占位音频
```

---

## 🔗 与主项目对接

| 模块 | 环境 | 职责 |
|------|------|------|
| `ai-engine-python/` | `uv` / Python 3.11 | FastAPI 服务，LLM + TTS + NDJSON |
| `digital-human/` | `uv` / Python 3.11 + CUDA | Wav2Lip + SadTalker 数字人渲染 |
| `backend-java/` | Java + Maven | 微服务基座、ES 知识库、WebSocket |
| `frontend-mp/` | 微信小程序 | 游客交互舱 |

**答辩演示**：`combined_pipeline.py --interactive` 串起全链路——AI 自主对话 + 精准口型 + 自然面部表情。

**生产环境**：离线用 `combined_pipeline.py --audio` 预生成组合视频，前端 `<video>` 播放。

---

## 📚 参考资料

- Wav2Lip 论文：https://arxiv.org/abs/2008.10010
- SadTalker 论文：https://arxiv.org/abs/2211.12194
- SadTalker GitHub：https://github.com/OpenTalker/SadTalker
- Wav2Lip GitHub：https://github.com/Rudrabha/Wav2Lip