# Web VRM 数字人调试台

基于 Vite + React + TypeScript + three.js + @pixiv/three-vrm 的数字人调试工具前端项目。

## 定位

这是专门用来调试 VRM 数字人的 Web 前端工具，不是最终游客端页面。它让你可以快速验证：

- VRM 模型加载和渲染
- 变装切换（多套 .vrm 文件）
- 表情 blendshape 测试
- 眨眼自动动画
- 口型驱动（手动滑杆 / 本地音频 / 后端音频）
- 后端 NDJSON 流式接口对接
- 音频、字幕、口型按句同步

## 快速启动

```powershell
cd frontend-web
npm install
npm run dev
```

打开浏览器访问 `http://localhost:5173`

## 环境变量

在项目根目录的 `.env` 文件中配置：

```env
VITE_AI_ENGINE_BASE_URL=http://localhost:8000
VITE_DEFAULT_TENANT_ID=ling_shan
```

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_AI_ENGINE_BASE_URL` | AI 引擎后端地址 | `http://localhost:8000` |
| `VITE_DEFAULT_TENANT_ID` | 默认租户 ID | `ling_shan` |

如果后端返回的 `audio_url` 是相对路径（例如 `/static/audio/xxx.mp3`），前端会自动用 `VITE_AI_ENGINE_BASE_URL` 补全。

## 模型放置

将 `.vrm` 格式的模型文件放入 `public/assets/vrm/` 目录：

```text
public/assets/vrm/
  guide-default.vrm   # 导游常服
  guide-hanfu.vrm     # 汉服导游
  guide-volunteer.vrm # 志愿者服装
  guide-festival.vrm  # 节庆服装
```

模型配置在 `src/features/vrm/modelManifest.ts` 中修改。

如果没有模型文件：
- 页面不会白屏
- 底部状态栏会提示「请放入 VRM 文件到 public/assets/vrm/」
- 可以通过拖拽本地 .vrm 文件到模型面板来临时预览

## 如何替换/新增服装模型

1. 将新的 `.vrm` 文件放入 `public/assets/vrm/`
2. 编辑 `src/features/vrm/modelManifest.ts`，在 `modelManifest` 数组中添加新条目：

```ts
{
  id: "volunteer",
  name: "志愿者服装",
  url: "/assets/vrm/guide-volunteer.vrm",
  idleAnimationUrl: "/assets/animations/idle_loop.vrma"
},
```

3. 重启开发服务器

## 如何测试本地音频口型

1. 启动调试台
2. 在左侧「口型调试」面板中：
   - 使用 **手动嘴型滑杆** 直接控制嘴型开合（测试 `aa` expression 是否有效）
   - 点击 **选择本地音频**，选择一个 mp3/wav 文件
   - 点击 **播放本地**，观察 VRM 口型是否随音频音量变化
3. 底部状态栏会显示实时 `mouthOpen` 数值

## 如何测试后端接口

1. 确保 `ai-engine-python` 后端正在运行：

```powershell
cd ai-engine-python
python main.py
```

2. 在调试台左侧「后端接口调试」面板中：
   - 确认 Tenant ID（默认为 `ling_shan`）
   - 输入问题内容（默认："请介绍一下灵山胜境"）
   - 点击 **发送请求**
3. 观察：
   - 右侧「NDJSON 原始日志」面板显示原始 NDJSON 行
   - 右侧「分句队列」面板显示解析后的分句
   - 接收到的 `audio_url` 自动加入播放队列
   - VRM 口型跟随音频音量变化
   - 底部显示当前字幕和音频 URL
4. 接口信息：
   - `POST /api/v1/digitalhuman/chat`
   - Headers: `Content-Type: application/json`, `X-Tenant-Id: {tenantId}`
   - Body: `{"session_id": "uuid", "content": "问题", "timestamp": 1717300000000}`
   - 响应: `application/x-ndjson`（逐行 JSON）

## 项目结构

```text
frontend-web/
  package.json
  vite.config.ts
  tsconfig.json
  index.html
  .env
  public/
    assets/
      vrm/          # 放置 .vrm 模型文件
      animations/   # 放置 .vrma 动画文件
      audio/        # 本地音频测试文件
  src/
    main.tsx        # 入口
    App.tsx         # 根组件（状态管理 + DebugLayout）
    config.ts       # 环境变量读取
    api/
      types.ts              # 接口类型定义
      digitalHumanClient.ts # NDJSON 流式客户端
    components/
      VrmStage.tsx      # VRM 渲染舞台
      ModelPanel.tsx    # 模型切换/拖拽
      ExpressionPanel.tsx # 表情测试
      LipSyncPanel.tsx  # 口型手动/本地音频/滑杆
      BackendPanel.tsx  # 后端接口调试
      LogPanel.tsx      # NDJSON 日志 / 队列 / 系统日志
    features/
      audio/
        lipSyncAnalyser.ts # Web Audio 音量分析器
        audioQueue.ts      # 串行音频播放队列
      vrm/
        VrmViewer.ts       # three.js + VRM 渲染器
        modelManifest.ts   # 预置模型列表
    styles/
      app.css           # 全局样式（工具型调试 UI）
  README.md
```

## 技术栈

- Vite + React + TypeScript
- three.js + @pixiv/three-vrm
- Web Audio API
- fetch + ReadableStream（NDJSON 解析）
- 纯 React state（无 Redux / 路由库 / 大型 UI 库）

## 注意事项

- 本调试台不接 Wav2Lip / SadTalker，口型驱动使用 Web Audio 音量分析
- 不上传 node_modules、未授权大体积 VRM 模型
- API key 不写入前端代码
- VRM 模型建议小于 40MB，支持 blink 和 aa blendshape
- 模型授权信息请记录在 `public/assets/vrm/LICENSES.md`