# 🎭 Live2D 数字人 — 前端对接指南

> **方案定位**：数字人是 **纯前端 Live2D 渲染**，通过 Cubism SDK 在浏览器中驱动二次元角色口型同步。
> 本模块 `digital-human/` 仅存放 **多租户人物配置**（`config/`），由 AI 引擎 `ai-engine-python/` 在运行时加载。

---

## 🏗️ 整体架构

```
┌──────────────────────────────────────────────────────────────────────┐
│                       🎭 Live2D 数字人 整体架构                        │
│                                                                       │
│  成员的 Flask 前端 (port 5000)                                        │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  [💬 极速文本]  [🧘 数字人]                                      ││
│  │  ┌────────────────────────────────────────────────────────────┐  ││
│  │  │  <iframe src="http://localhost:5173">                      │  ││
│  │  │                                                             │  ││
│  │  │   你的 Live2D 前端 (React + Vite + Cubism SDK)               │  ││
│  │  │   · Live2D 角色渲染                                         │  ││
│  │  │   · Web Audio API + PCM 唇形同步                            │  ││
│  │  │   · 字幕显示                                                │  ││
│  │  │                                                             │  ││
│  │  └────────────────────────────────────────────────────────────┘  ││
│  │  聊天消息                                                         ││
│  │  [输入框] [发送]                                                  ││
│  └──────────────────────────────────────────────────────────────────┘│
│       │  postMessage({text_chunk, audio_url})                         │
│       ▼                                                               │
│  POST http://localhost:8000/api/v1/digitalhuman/chat                  │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  AI 引擎 (FastAPI, port 8000)                                    ││
│  │  RAG 检索 → LLM 流式生成 → edge-tts 逐句合成                      ││
│  │  返回 NDJSON: {"seq":1, "text_chunk":"...", "audio_url":"..."}   ││
│  └──────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

### 通信流程

```
① 用户在成员 Flask 页面输入问题
② 成员前端 POST → AI 引擎 → 收到 NDJSON 流 (逐句文字+音频URL)
③ 成员前端 postMessage → iframe 内的 Live2D 前端
④ Live2D 前端: 显示字幕 + 加载音频 → PCM 分析 → 驱动角色口型
```

---

## 🔧 第一部分：AI 引擎部署（必做）

### 1. 安装依赖

```bash
cd ai-engine-python
pip install -r requirements.txt
```

所需依赖（纯 CPU，无 GPU）：
- `fastapi` + `uvicorn` — HTTP 服务
- `openai` — LLM 流式调用
- `httpx` — 异步 HTTP 客户端
- `edge-tts` — 语音合成
- `python-dotenv` — 环境变量
- `pydantic` — 数据校验

### 2. 配置 API Key

```bash
cp .env.example .env
```

编辑 `.env`，填入 LLM API Key（二选一）：

```bash
# 方案 A：DeepSeek（推荐，便宜且快）
LLM_API_KEY=sk-your-deepseek-key
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat

# 方案 B：通义千问（阿里云百炼，有免费额度）
# QWEN_API_KEY=sk-your-qwen-key
# 需在 main.py 中切换到 Qwen client
```

> 申请地址：  
> DeepSeek: https://platform.deepseek.com/api_keys  
> 通义千问: https://bailian.console.aliyun.com

### 3. 启动

```bash
cd ai-engine-python
python main.py
# → FastAPI 运行在 http://localhost:8000
```

验证：
```bash
curl http://localhost:8000/api/v1/health
# → {"status":"ok","model":"deepseek-chat",...}
```

---

## 🔗 第二部分：将 Live2D 数字人嵌入你的 Flask 前端

> 以下修改全部在你的 `frontend/` 目录中，**不会改变你的页面样式**。

### 需要的前端技术

| 工具 | 用途 | 是否必须 |
|------|------|----------|
| Node.js ≥18 | 运行 Vite 构建工具 | ✅ 必须 |
| pnpm | 包管理器（`npm install -g pnpm`） | ✅ 必须 |
| 浏览器支持 Web Audio API | 音频分析 + 唇形同步 | ✅ 现代浏览器均支持 |
| Cubism SDK for Web | Live2D 渲染引擎 | 已通过 npm 配置，自动安装 |

### 修改 1：`frontend/static/index.html`

在聊天页面（`<section id="page-chat">`）的 `<div class="chat-container">` 内部最上方，模式切换栏下方，添加 iframe 容器：

```html
<!-- 在 <div class="mode-switch">...</div> 之后添加 -->
<div id="live2dContainer" class="live2d-container" style="display:none;">
    <iframe id="live2dFrame" src="http://localhost:5173"
            allow="autoplay; microphone"
            style="width:100%; height:300px; border:none; border-radius:12px;">
    </iframe>
</div>
```

**说明**：iframe 默认隐藏，用户切换到"数字人"标签时才显示。

### 修改 2：`frontend/static/style.css`

在文件末尾添加：

```css
/* ===== Live2D 数字人容器 ===== */
.live2d-container {
    margin: 0 12px 8px;
    overflow: hidden;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    background: rgba(0, 0, 0, 0.1);
}

.live2d-container.active {
    display: block !important;
}
```

### 修改 3：`frontend/static/script.js`

修改 `switchChatMode()` 函数，添加 iframe 显隐控制：

```javascript
function switchChatMode(mode) {
    currentChatMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');

    const msgList = document.getElementById('chatMessages');
    msgList.innerHTML = '<div class="msg assistant welcome-msg">🙏 欢迎来到灵山圣地！我是您的智能导览助手...</div>';

    // 控制 Live2D iframe 显隐
    const container = document.getElementById('live2dContainer');
    if (mode === 'digital_human') {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}
```

修改 `sendChat()` 函数中数字人模式的 else 分支（原第 248-255 行假数据），替换为：

```javascript
} else {
    // ========== 数字人模式：调用 AI 引擎 + 传给 Live2D ==========
    const AI_ENGINE_URL = 'http://localhost:8000';
    const TENANT_ID = 'ling_shan';
    const iframe = document.getElementById('live2dFrame');

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

        if (!response.ok) throw new Error('AI 引擎异常: ' + response.status);

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
                    if (chunk.type === 'end') break;
                    if (chunk.text_chunk) fullText += chunk.text_chunk;

                    // 传给 Live2D iframe
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage({
                            type: 'speak',
                            text_chunk: chunk.text_chunk || '',
                            audio_url: chunk.audio_url || '',
                            ai_engine_url: AI_ENGINE_URL,
                        }, '*');
                    }

                    // 同时播放音频（降级方案：iframe 内也会播）
                    if (chunk.audio_url && !iframe) {
                        if (currentAudio) { currentAudio.pause(); currentAudio = null; }
                        const url = chunk.audio_url.startsWith('http') ? chunk.audio_url : AI_ENGINE_URL + chunk.audio_url;
                        currentAudio = new Audio(url);
                        currentAudio.play().catch(() => {});
                    }
                } catch (e) { /* 忽略解析失败 */ }
            }
        }
        if (fullText) {
            container.innerHTML += `<div class="msg assistant">${fullText}</div>`;
            container.scrollTop = container.scrollHeight;
        }
    } catch (e) {
        console.error(e);
        container.innerHTML += `<div class="msg assistant">🙏 数字人暂时在休息，请稍后再试。</div>`;
    }
}
```

---

## 🎨 第三部分：Live2D 前端配套修改

你的 `frontend-web/` 是 **React + Vite + Cubism SDK** 项目，需要添加 postMessage 接收逻辑。

### 修改 `frontend-web/src/App.tsx`

在组件中添加 `useEffect` 监听来自父页面的消息：

```typescript
// 在组件函数内部，现有 useEffect 附近添加
useEffect(() => {
    const handler = (event: MessageEvent) => {
        // 安全检查：只接受可信来源
        if (!event.data || event.data.type !== 'speak') return;

        const { text_chunk, audio_url, ai_engine_url } = event.data;

        // 显示字幕
        if (text_chunk) {
            setCurrentSubtitle(text_chunk);
        }

        // 播放音频
        if (audio_url && audioEngineRef.current) {
            const fullUrl = audio_url.startsWith('http')
                ? audio_url
                : (ai_engine_url || 'http://localhost:8000') + audio_url;

            audioEngineRef.current.enqueue([{
                seq: Date.now(),
                text_chunk: text_chunk || '',
                audio_url: fullUrl,
            }]);
            setQueueLength(audioEngineRef.current.getQueueLength());
        }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
}, []);
```

---

## 🚀 启动步骤（按顺序）

```bash
# 终端 1：启动 AI 引擎
cd ai-engine-python
pip install -r requirements.txt
cp .env.example .env        # 编辑填入 LLM_API_KEY
python main.py
# → http://localhost:8000 ✅

# 终端 2：启动 Live2D 前端
cd frontend-web
pnpm install
pnpm dev
# → http://localhost:5173 ✅

# 终端 3：启动你的 Flask 前端
cd frontend
pip install flask pillow requests
python app.py
# → http://localhost:5000 ✅
```

打开浏览器访问 `http://localhost:5000`，切换到 "🧘 数字人" 标签，输入问题即可看到 Live2D 角色张嘴回答。

---

## 📂 文件说明

```
smart-scenery-ai-hub/
├── ai-engine-python/          ← AI 引擎（LLM + TTS）
│   ├── main.py                ← FastAPI /api/v1/digitalhuman/chat
│   ├── .env.example           ← 环境变量模板
│   └── requirements.txt       ← Python 依赖
│
├── frontend-web/              ← Live2D 数字人前端（React + Vite）
│   ├── src/
│   │   ├── App.tsx            ← 主页面
│   │   ├── api/digitalHumanClient.ts  ← API 客户端
│   │   ├── features/audio/    ← 音频引擎 + 唇形同步
│   │   └── features/live2d/   ← Cubism SDK 封装
│   └── public/assets/live2d/  ← Live2D 模型文件
│
├── frontend/                  ← 你的 Flask 前端（需修改 3 个文件）
│   ├── app.py
│   └── static/
│       ├── index.html         ← 添加 iframe 容器
│       ├── style.css          ← 添加 iframe 样式
│       └── script.js          ← 替换假数据 + postMessage
│
└── digital-human/             ← 本模块（仅配置）
    ├── config/                ← 多租户人物设定
    └── README.md              ← 本文件
```

---

## 🐛 常见问题

### Q: iframe 中 Live2D 不显示？
检查 Vite 前端是否正常运行：`http://localhost:5173` 能直接打开并看到角色。
Chrome 可能需要允许 `localhost` 的 iframe 自动播放音频。

### Q: postMessage 没收到？
打开浏览器 Console，确认成员页面和 iframe 都无跨域错误。
`postMessage` 的 `targetOrigin: '*'` 允许任何来源接收。

### Q: 前端调用 8000 端口被 CORS 阻止？
AI 引擎已配置 `CORSMiddleware(allow_origins=["*"])`，不会阻止。

### Q: AI 引擎启动报错？
检查 `.env` 文件中 `LLM_API_KEY` 是否填写正确。
首次运行时 AI 引擎需要访问外网调用 LLM API 和 TTS 服务。

### Q: pnpm 是什么？没有怎么办？
```bash
npm install -g pnpm
```
如果不想装 pnpm，也可以用 npm：
```bash
cd frontend-web
npm install
npm run dev