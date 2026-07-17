# 🏔️ 智慧景区 AI 导览系统

基于 AI 大模型 + Live2D 数字人的智慧景区导览解决方案，支持游客端导览与管理端运营双模式。

## 核心特性

- **双端分离**：游客入口（导览/景点/路线/咨询）与管理员入口（数据大屏/知识库/数字人配置/游客报告）分离
- **Live2D 数字人**：9 个数字人角色可选，流式语音对话 + 实时口型驱动
- **3D 路线规划**：高德地图 + 景区内部真实路线坐标，步行/驾车/公交三种出行方式
- **智能问答**：通义千问 VL 多模态模型 + RAG 知识库检索，支持图片识别
- **数据大屏**：14 万条游客行为数据分析，可视化图表 + 业务建议
- **拍照识物**：上传图片识别景区植物、建筑等

## 项目结构

```
smart-scenery-ai-hub/
├── frontend_new/            # React + Vite 前端
│   ├── src/
│   │   ├── pages/           # 页面组件
│   │   │   ├── LoginPage.tsx       # 身份选择登录页
│   │   │   ├── HomePage.tsx        # 首页总览
│   │   │   ├── DigitalHumanPage.tsx # 数字人导览
│   │   │   ├── PoiListPage.tsx     # 景点列表
│   │   │   ├── PoiDetailPage.tsx   # 景点详情
│   │   │   ├── RoutePage.tsx       # 路线规划
│   │   │   ├── VisionPage.tsx      # 拍照识物
│   │   │   ├── InfoPage.tsx        # 实时资讯
│   │   │   ├── TextChatPage.tsx    # 智能咨询
│   │   │   └── admin/              # 管理端页面
│   │   │       ├── DashboardPage.tsx
│   │   │       ├── KnowledgePage.tsx
│   │   │       ├── DigitalHumanConfigPage.tsx
│   │   │       └── ReportPage.tsx
│   │   ├── components/      # 共用组件
│   │   │   ├── Header.tsx          # 侧边导航栏
│   │   │   └── Live2DStage.tsx     # Live2D 渲染画布
│   │   ├── features/live2d/ # Live2D SDK 封装
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── api/             # API 客户端
│   │   ├── map/             # 景区地图数据
│   │   └── styles/          # 全局样式
│   ├── public/assets/
│   │   ├── scenic/          # 景点图片
│   │   ├── live2d/          # Live2D 模型
│   │   └── bg/              # 登录页背景
│   └── vite.config.ts
│
├── backend-java/            # Spring Boot 后端
│   └── src/main/java/com/smartscenery/
│       ├── controller/      # 14 个 REST 控制器
│       ├── service/         # 业务逻辑层
│       ├── repository/      # JPA 数据访问
│       ├── entity/          # 10 个数据实体
│       ├── dto/             # 数据传输对象
│       ├── config/          # 启动配置
│       ├── filter/          # 多租户拦截器
│       └── websocket/       # WebSocket 聊天
│
├── ai-engine-python/        # Python AI 引擎
│   ├── main.py              # FastAPI 入口
│   ├── core/
│   │   ├── llm_client.py    # LLM 调用（通义千问）
│   │   ├── rag_processor.py # RAG 知识检索
│   │   └── tts_generator.py # Edge-TTS 语音合成
│   └── config/digital_human/ # 数字人配置文件
│
├── assets/                  # 资源文件
│   ├── lingshan/            # 灵山胜景素材
│   └── data/                # 行为分析数据
│
└── scripts/                 # 数据分析脚本
```

## 快速启动

### 前置要求

- Node.js 18+
- Java 24+、Maven 3.8+（后端可选，前端可独立运行）
- Python 3.10+（AI 引擎可选，用于数字人对话/语音/TTS）

> 前端可独立运行（静态资源和 Live2D 渲染不需要后端），但数字人对话、语音播报、知识库等功能需要 Java 后端 + AI 引擎同时启动。

### 1️⃣ 启动前端（必须）

```bash
cd frontend_new
npm install
npm run dev
# → http://localhost:5173
```

打开浏览器即可看到登录页，选择「游客入口」或「管理员入口」进入系统。前端独立运行时，数字人对话将无法获取响应（显示"AI 服务暂时无法响应"），但页面浏览、景点列表、路线规划（地图）、实时资讯等静态功能正常。

### 2️⃣ 启动 Java 后端

```bash
cd backend-java
mvn spring-boot:run
# → http://localhost:9000（H2 内存数据库，自动初始化数据）
```

提供知识库 CRUD、景点 POI 数据、实时信息、数字人配置等 REST API。H2 模式无需外部数据库，启动即可用。

### 3️⃣ 启动 AI 引擎

```bash
cd ai-engine-python
pip install -r requirements.txt
# .env 已预填配置，通常无需修改即可使用
python main.py
# → http://localhost:8000
```

提供数字人流式对话（LLM + TTS 语音合成）、图片识别（多模态）、RAG 知识检索。

### 启动顺序

```
1. 前端      npm run dev        → :5173
2. Java 后端 mvn spring-boot:run → :9000
3. AI 引擎   python main.py      → :8000
```

三个服务可独立启动，但完整功能需要全部运行。前端访问 `http://localhost:5173` 即可。

## ⚙️ 配置文件说明

### AI 引擎 (`ai-engine-python/.env`)

```env
# 通义千问 API Key（必填，已预填示例 Key，建议替换为自己的）
LLM_API_KEY=sk-ws-H.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
QWEN_API_KEY=sk-ws-H.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 通义千问模型地址与版本
LLM_BASE_URL=https://llm-j3lh86dj4o8kpa87.cn-beijing.maas.aliyuncs.com/compatible-mode/v1
LLM_MODEL=qwen3-vl-plus                # 支持多模态的视觉语言模型

# Java 后端地址（AI 引擎从 Java 后端获取知识库与数字人配置）
BACKEND_BASE_URL=http://localhost:9000
```

**API Key 获取**：前往[阿里云百炼平台](https://bailian.console.aliyun.com/) → 模型广场 → API-KEY 管理 → 创建 API Key。将 `sk-xxx` 填入 `LLM_API_KEY` 和 `QWEN_API_KEY`（两个值相同即可）。

### 前端配置 (`frontend_new/vite.config.ts`)

```typescript
// Vite 开发代理，将前端请求转发到后端服务
server: {
  proxy: {
    '/api/v1/vision':      { target: 'http://localhost:8000' },  // AI 引擎
    '/api/v1/digitalhuman': { target: 'http://localhost:8000' },  // AI 引擎
    '/api':                 { target: 'http://localhost:9000' },  // Java 后端
    '/static/audio':        { target: 'http://localhost:8000' },  // TTS 音频
    '/ws':                  { target: 'ws://localhost:9000' },    // WebSocket
  }
}
```

无需修改即可本地开发。如需更换后端端口，修改对应 target 即可。

### 高德地图与天气 (`frontend_new/src/api/config.ts`)

```typescript
高德地图与天气 — 在 `frontend_new/src/api/config.ts` 中配置 Key，或通过 Vite 环境变量 `VITE_AMAP_KEY` 注入。
export const LINGSHAN_CITY = '无锡';
```

线路规划页面的高德地图 Key 在 `frontend_new/src/pages/RoutePage.tsx` 中配置。

### Java 后端 (`backend-java/src/main/resources/application.yml`)

默认使用 H2 内存数据库，启动即用，无需 MySQL。生产环境可切换为 MySQL。

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | React 18、TypeScript、Vite 5 |
| **后端** | Java、Spring Boot 3.4、JPA、H2 |
| **AI 引擎** | Python、FastAPI、通义千问 VL、Edge-TTS |
| **数字人** | Live2D Cubism SDK 5 |
| **地图** | 高德地图 JS API 2.0 |
| **数据库** | H2（开发）/ MySQL（生产） |
| **数据分析** | Pandas、14 万行游客行为数据 |

## 数字人配置

9 个 Live2D 模型对应 9 个数字人角色：Haru、Hiyori、871、Z、阮梅、BetaSmodel、Kirin Kirinja、Osage Girl、Half-Demon Elf。每个角色配置独立的人设提示词、TTS 语音/语速/音调。

## 许可证

本项目仅供学习交流使用。
