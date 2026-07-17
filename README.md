# 🏔️ 智慧景区 AI 导览系统

> 基于 AI 大模型 + 音视解耦架构的智慧景区导览解决方案，支持**极速文本模式**与**数字人模式**双交互形态。

---

## 📋 项目概览

本项目是一套面向景区的智能导览系统，通过 AI 大模型技术为游客提供个性化、沉浸式的游览体验。系统采用**音视解耦架构**，后端完成句级文本切片与 TTS 音频生成，前端根据音频播放状态自主切换数字人视频，实现流畅自然的交互体验。

### 核心特性

- 🤖 **双模式交互**：极速文本模式（WebSocket 流式）与数字人模式（HTTP 流式 + 音视解耦）
- 🗺️ **智能路线推荐**：基于游客偏好与实时客流数据的错峰调度算法
- 📸 **拍照识物**：多模态视觉问答，识别景区植物、建筑等
- 📡 **实时资讯**：天气、人流、公告等景区实时信息
- 📚 **离线知识库**：弱网环境下的降级兜底方案
- 🔒 **敏感词过滤**：AC 自动机实现入参 + 出参双向安全校验
- 🏢 **多租户 SaaS**：支持多景区独立部署与数据隔离

---

## 🏗️ 项目结构

```
smart-scenery-ai-hub/
├── frontend-mp/              # 微信小程序前端
│   ├── pages/
│   │   ├── index/            # 首页
│   │   ├── chat-text/        # 极速文本模式聊天页
│   │   └── chat-avatar/      # 数字人模式聊天页
│   ├── app.js                # 小程序入口
│   ├── app.json              # 小程序全局配置
│   ├── config.js             # 后端接口地址配置
│   └── package.json          # 依赖配置（含 Vant Weapp）
├── docs/
│   └── API.md                # 接口文档 v2.0（音视解耦版）
└── README.md
```

> **注**：后端 Java 模块（`backend-java/`）与 AI Python 模块（`ai-engine-python/`）正在开发中，敬请期待。

---

## 🚀 快速开始

### 前置要求

- Node.js
- 微信开发者工具
- Java 17+（后端）
- Python 3.10+（AI 引擎）
- MySQL + Redis + Elasticsearch

### 1️⃣ 前端（微信小程序）

```bash
# 进入前端目录
cd frontend-mp

# 安装依赖
npm install

# 使用微信开发者工具打开 frontend-mp 目录
# 配置 config.js 中的后端接口地址
```

### 2️⃣ 后端（Java + MySQL + Redis + ES）

```bash
cd backend-java
mvn clean package
docker-compose up -d
```

### 3️⃣ AI 引擎（Python）

```bash
cd ai-engine-python
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 🎯 交互模式

### 极速文本模式

- **协议**：WebSocket
- **特点**：低延迟、纯文本流式返回
- **适用场景**：弱网环境、快速问答

### 数字人模式（音视解耦）

- **协议**：HTTP 长流式 POST（NDJSON）
- **核心架构**：
  1. 后端对 AI 回复进行句级切片
  2. 每句独立生成 MP3 音频并上传 OSS
  3. 流式返回 `text_chunk + audio_url`
  4. 前端监听音频播放事件，切换 `idle.mp4 ↔ speaking.mp4`
- **适用场景**：沉浸式导览、交互大屏

---

## 📖 接口文档

详细接口定义请参阅 [docs/API.md](docs/API.md)，涵盖：

| 接口分类 | 说明 |
|---------|------|
| WebSocket 极速文本 | 实时文本对话流式接口 |
| HTTP 数字人模式 | 音视解耦核心接口 |
| RESTful 通用接口 | POI 查询、路线推荐、拍照识物、实时资讯 |
| 管理后台接口 | 知识库上传、POI 配置、服务监控、客流模拟 |

---

## 🧩 技术栈

| 层级 | 技术 |
|------|------|
| **前端** | 微信小程序、Vant Weapp |
| **后端** | Java、Spring Boot、MySQL、Redis、Elasticsearch |
| **AI 引擎** | Python、FastAPI、大语言模型、Edge-TTS |
| **基础设施** | Docker、OSS 对象存储 |

---

## 📌 开发路线

- [x] 项目架构设计与接口规范定义（v2.0 音视解耦版）
- [x] 微信小程序前端框架搭建
- [x] 后端 Java 服务开发
- [x] AI 引擎 Python 服务开发
- [x] 端到端联调测试
- [x] 生产环境部署

---

## 🤝 团队分工

| 角色 | 职责 |
|------|------|
| **成员 A（后端）** | Java 后端开发、AI 回复句级分句、Edge-TTS 音频生成、OSS 上传 |
| **成员 B（Mock）** | 接口 Mock 数据开发、严格遵循 API 文档 JSON 结构 |
| **成员 C（前端）** | 微信小程序开发、数字人页面音视频切换逻辑 |

---

## 📄 许可证

本项目仅供学习交流使用。
