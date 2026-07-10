# 🎭 Live2D 数字人 — 接入指南

> **方案定位**：数字人是 **纯前端 Live2D 渲染**，通过 Cubism SDK 在浏览器中驱动二次元角色口型同步。
> 本模块 `digital-human/` 仅存放 **多租户人物配置**（`config/`），由 AI 引擎 `ai-engine-python/` 在运行时加载。

---

## 🏗️ 整体架构

```
┌──────────────────────────────────────────────────────────────────┐
│                     🎭 Live2D 数字人 整体架构                      │
│                                                                   │
│  ┌─────────┐      HTTP NDJSON       ┌────────────┐               │
│  │ 前端页面 │ ◄──────────────────── │  AI 引擎    │               │
│  │ (Flask  │   POST /api/v1/        │ (FastAPI)  │               │
│  │  或任何  │    digitalhuman/chat   │ :8000      │               │
│  │  前端)   │                        │            │               │
│  └────┬────┘                        └─────┬──────┘               │
│       │                                   │                       │
│       │ ① 用户输入文本                      │ ② RAG + LLM + TTS    │
│       │    "灵山大佛在哪"                    │    生成逐句回答+音频  │
│       │                                   │                       │
│       │ ③ NDJSON 流式响应                   │                       │
│       │   {"seq":1, "text_chunk":"...",     │                       │
│       │    "audio_url":"/static/..."}       │                       │
│       │                                   │                       │
│       ▼                                   │                       │
│  ┌─────────┐                              │                       │
│  │ Live2D  │ ④ audio_url → 加载 TTS 音频   │                       │
│  │ 渲染引擎 │ ⑤ PCM 分析 → 口型参数          │                       │
│  │  +      │ ⑥ Cubism SDK → 驱动角色张嘴    │                       │
│  │ Audio   │                              │                       │
│  │ Engine  │                              │                       │
│  └─────────┘                              │                       │
└──────────────────────────────────────────────────────────────────┘
```

### 关键点

| 你的前端 | 职责 |
|----------|------|
| **任意网页** | 发送请求到 AI 引擎，接收 NDJSON 流，用 `<audio>` 播放 TTS 音频 |
| **AI 引擎** | 接收文本 → RAG 检索 → LLM 生成回答 → TTS 逐句合成 → 返回 `{seq, text_chunk, audio_url}` |
| **Live2D 渲染**（可选）| 加载 Cubism SDK + Live2D 模型，根据 PCM 音频波形实时驱动角色口型 |

> 💡 **你的前端不一定需要 Live2D 渲染**。最简单的接入方式：调用 AI 引擎 API，用 `<audio>` 标签播放 TTS 音频，并逐句显示文字即可。

---

## 🔌 API 接口协议

### 端点

```
POST http://localhost:8000/api/v1/digitalhuman/chat
```

### 请求头

```
Content-Type: application/json
X-Tenant-Id: ling_shan        ← 必填，多租户标识
```

### 请求体

```json
{
  "session_id": "任意UUID字符串",
  "content": "灵山大佛在哪里？",    ← 用户输入
  "timestamp": 1752240000000       ← 毫秒时间戳
}
```

### 响应（NDJSON 流）

每行一个 JSON 对象，以 `\n` 分隔：

```json
{"seq": 1, "text_chunk": "灵山大佛位于无锡市滨湖区灵山圣地景区中心，", "audio_url": "/static/audio/ling_shan/a1b2c3_001.mp3"}
{"seq": 2, "text_chunk": "大佛高88米，是举世闻名的青铜大佛。", "audio_url": "/static/audio/ling_shan/a1b2c3_002.mp3"}
{"seq": 3, "type": "end", "reason": "complete"}
```

| 字段 | 说明 |
|------|------|
| `seq` | 句子序号 |
| `text_chunk` | 当前句子文本（TTS 的内容） |
| `audio_url` | TTS 生成的 MP3 文件路径（相对于 AI 引擎的静态文件目录） |
| `type: "end"` | 流结束标记 |

---

## 📝 在你的 Flask 前端中接入（最简方案）

### 现状

你的 `frontend/static/script.js` 中，数字人模式的 `sendChat()` 函数（第 248-255 行）是**写死的假数据**：

```javascript
// 当前代码 — 假数据
} else {
    container.innerHTML += `<div class="msg assistant">🧘 数字人正在冥想思考...</div>`;
    setTimeout(() => {
        container.innerHTML += `<div class="msg assistant">🙏 施主您好，灵山圣地乃佛教文化圣地...</div>`;
    }, 1000);
}
```

### 替换方案

将上面的假数据替换为以下真实调用：

```javascript
} else {
    // ========== 数字人模式：调用 AI 引擎 ==========
    const AI_ENGINE_URL = 'http://localhost:8000';
    const TENANT_ID = 'ling_shan';

    try {
        const response = await fetch(AI_ENGINE_URL + '/api/v1/digitalhuman/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant-Id': TENANT_ID,
            },
            body: JSON.stringify({
                session_id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
                content: text,
                timestamp: Date.now(),
            }),
        });

        if (!response.ok) {
            throw new Error('AI 引擎异常: ' + response.status);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        let currentAudio = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const chunk = JSON.parse(line);

                    // 结束标记
                    if (chunk.type === 'end') {
                        console.log('AI 回答完成:', chunk.reason);
                        break;
                    }

                    // 累加文字
                    if (chunk.text_chunk) {
                        fullText += chunk.text_chunk;
                    }

                    // 播放音频（如果有）
                    if (chunk.audio_url) {
                        // 停止前一个音频
                        if (currentAudio) { currentAudio.pause(); currentAudio = null; }

                        const audioUrl = chunk.audio_url.startsWith('http')
                            ? chunk.audio_url
                            : AI_ENGINE_URL + chunk.audio_url;

                        currentAudio = new Audio(audioUrl);
                        currentAudio.play().catch(e => console.warn('音频播放失败:', e));
                    }
                } catch (e) {
                    // 忽略解析失败的行
                }
            }
        }

        // 显示完整 AI 回复
        if (fullText) {
            container.innerHTML += `<div class="msg assistant">${fullText}</div>`;
            container.scrollTop = container.scrollHeight;
        }

    } catch (e) {
        console.error('数字人请求失败:', e);
        container.innerHTML += `<div class="msg assistant">🙏 数字人暂时在休息，请稍后再试。</div>`;
        container.scrollTop = container.scrollHeight;
    }
}
```

### 更简单：只需文字 + 语音（无需 Live2D 渲染）

如果你暂时不需要 Live2D 角色渲染，只需要 **AI 智能回答 + TTS 语音播放**，上面的代码就足够了。

---

## 🎨 完整 Live2D 数字人方案（参考实现）

如果后续需要 **真正的二次元数字人角色在页面上张嘴说话**，参考 `frontend-web/` 目录（React + Vite + Cubism SDK）：

```
frontend-web/
├── src/
│   ├── App.tsx                         ← 主页面：对话 + Live2D 舞台
│   ├── api/
│   │   ├── digitalHumanClient.ts       ← AI 引擎 HTTP 客户端
│   │   └── types.ts                    ← 数据类型定义
│   ├── features/
│   │   ├── audio/
│   │   │   ├── AudioEngine.ts          ← 音频队列 + 唇形同步驱动
│   │   │   └── lipSyncAnalyser.ts      ← PCM 波形分析
│   │   └── live2d/
│   │       ├── Live2DViewer.ts         ← Cubism SDK 封装
│   │       └── modelManifest.ts        ← 模型清单
│   └── config.ts
└── public/assets/live2d/               ← Live2D 模型文件（.moc3, .physics3.json 等）
```

这里面已经包含了完整的：
- **AudioEngine**：音频队列管理 + 无缝播放
- **lipSyncAnalyser**：实时 PCM 分析 → 口型参数
- **Live2DViewer**：Cubism SDK 驱动角色渲染
- **唇形同步**：音频波形 → OpenY/Form → 角色张嘴咧嘴

---

## 🚀 启动步骤

### 1. 启动 AI 引擎

```bash
cd ai-engine-python

# 首次运行：安装依赖
pip install -r requirements.txt

# 复制并配置环境变量
cp .env.example .env
# 编辑 .env 填写 LLM_API_KEY 等信息

# 启动
python main.py
# → FastAPI 运行在 http://localhost:8000
```

### 2. 启动你的 Flask 前端

```bash
cd frontend
pip install flask pillow requests
python app.py
# → Flask 运行在 http://localhost:5000
```

### 3. （可选）启动完整 Live2D 前端

```bash
cd frontend-web
pnpm install
pnpm dev
# → Vite 运行在 http://localhost:5173
```

### 启动顺序总结

```
① AI 引擎 (8000)  →  ② Flask 前端 (5000) 或 Vite 前端 (5173)
```

所有前端都通过 `POST http://localhost:8000/api/v1/digitalhuman/chat` 调用 AI 引擎。

---

## 📂 本模块文件说明

```
digital-human/
├── config/
│   ├── __init__.py
│   ├── profile_loader.py              ← 多租户人物配置加载器（AI 引擎导入）
│   └── digital_human_profiles.json    ← 各景区的人物设定（名称、语音、人设）
├── assets/                            ← 数字人静态资源（如有）
├── pyproject.toml                     ← 轻量依赖（pyyaml, httpx, pydantic）
└── README.md                          ← 本文件
```

> ⚠️ **旧方案已移除**：Wav2Lip（GPU 推理）和 SadTalker（3D 人脸重建）已从本模块移除。
> 数字人 100% 由 Live2D 前端方案实现，无需 GPU，纯浏览器渲染。

---

## 🐛 常见问题

### Q: 前端调用 8000 端口被 CORS 阻止？
AI 引擎已配置 `CORSMiddleware(allow_origins=["*"])`，允许任何来源跨域。

### Q: 音频 URL 是相对路径怎么处理？
音频 URL 格式为 `/static/audio/{tenant}/{session}_{seq}.mp3`，需要拼接 AI 引擎地址：
```javascript
const fullUrl = 'http://localhost:8000' + audio_url;
```

### Q: 运行 AI 引擎需要什么配置？
需要有效的 LLM API Key（DeepSeek 或 Qwen），在 `ai-engine-python/.env` 中配置。
参考 `ai-engine-python/.env.example`。