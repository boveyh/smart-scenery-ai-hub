# Live2D 数字人调试台

基于 **Live2D Cubism SDK for Web** 的数字人 Web 调试工具。

## 功能

- ✅ Live2D 模型加载（.moc3 + .model3.json）
- ✅ 模型切换（预置多模型清单）
- ✅ 本地模型文件拖拽/上传
- ✅ 口型控制（手动滑杆 + Web Audio 音频驱动）
- ✅ 表情/参数控制（ParamMouthOpenY、ParamEyeLOpen 等）
- ✅ 自动眨眼 & 呼吸动画
- ✅ 后端专家系统联调（NDJSON 流式接口）
- ✅ 实时字幕 & 音频队列播放
- ✅ 完整日志记录

## 前置条件

### 必须手动下载

1. **Live2D Cubism SDK for Web**
   - 下载地址：https://www.live2d.com/download/cubism-sdk/
   - 或 Github：https://github.com/Live2D/CubismWebSamples
   - 放到 `public/assets/live2d/cubism-sdk/` 下

2. **Live2D 示例模型**（推荐 Haru / Hiyori）
   - 下载地址：https://www.live2d.com/download/sample-data/
   - 放到 `public/assets/live2d/{模型名}/` 下

详细步骤见：`public/assets/live2d/README.md`

## 启动

```bash
cd frontend-web
npm install
npm run dev
```

打开 http://localhost:5173

## 技术栈

- Vite + React 18 + TypeScript
- Live2D Cubism SDK for Web (Cubism 4/5)
- WebGL 渲染
- Web Audio API（音频分析 + 口型同步）
- Fetch + ReadableStream（NDJSON 流式解析）
- CSS 自定义属性（主题变量）

## 目录结构

```
frontend-web/
├── public/assets/live2d/      ← Live2D SDK + 模型文件（需手动下载）
├── src/
│   ├── features/
│   │   ├── live2d/
│   │   │   ├── Live2DViewer.ts     ← 核心渲染器
│   │   │   └── modelManifest.ts    ← 模型清单配置
│   │   └── audio/
│   │       ├── audioQueue.ts       ← 音频队列播放
│   │       └── lipSyncAnalyser.ts  ← 口型分析器
│   ├── components/
│   │   └── Live2DStage.tsx         ← 舞台组件
│   ├── api/
│   │   ├── digitalHumanClient.ts   ← 后端API客户端
│   │   └── types.ts
│   ├── App.tsx                     ← 主应用（调试面板布局）
│   ├── config.ts
│   ├── main.tsx
│   └── styles/
│       └── app.css
├── index.html                     ← 入口（引入 Live2D SDK）
├── package.json
├── tsconfig.json
└── vite.config.ts