# Web VRM 数字人调试台实施计划

## 定位

先做一个专门用来调试数字人的 Web 前端，不做最终游客端页面。它的目标是让负责前端、模型和后端联调的同学可以快速验证：

- VRM 模型能不能加载
- 表情和眨眼是否可用
- 口型是否能被音频驱动
- 多套服装模型能不能切换
- 后端 `text_chunk + audio_url` 流式接口能不能接上
- 音频、字幕、口型是否能按句同步

这个调试台后续可以沉淀成正式 Web 数字人页面，但第一版优先做“工具”，不是做“面向游客的产品界面”。

## 核心方案

使用 ChatVRM 的技术思路，不直接复制整套 ChatVRM：

```text
three.js + @pixiv/three-vrm
  -> 加载 VRM
  -> 播放/测试待机动作
  -> 测试表情 blendshape
  -> 播放音频并用 Web Audio 驱动嘴型
  -> 接入本项目 AI 引擎接口做真实链路调试
```

第一版不接 Wav2Lip/SadTalker。它们更适合离线视频生成，不适合作为 Web VRM 调试链路的默认依赖。

## 推荐子项目

```text
frontend-web/
```

这个目录是一个独立 Vite + React + TypeScript 调试台，方便单独上传 GitHub，也方便前端同学接手。

## 页面功能

### 1. 模型调试

- 从 `modelManifest.ts` 读取预置模型列表。
- 支持切换不同 `.vrm` 文件。
- 支持本地拖拽/选择 `.vrm` 文件临时预览。
- 展示当前模型加载状态、文件名、错误信息。
- 没有模型文件时页面不能白屏，要显示可理解提示。

### 2. 变装调试

第一版变装用“切换整套 VRM 模型”：

```text
guide-default.vrm
guide-hanfu.vrm
guide-volunteer.vrm
guide-festival.vrm
```

调试台要能快速切换这些模型，用来验证：

- 模型能否加载
- 角色是否居中
- 服装是否穿模
- 表情/口型是否还可用
- 文件大小是否影响加载速度

暂不做真正的运行时衣服部件换装。

### 3. 口型调试

提供三种测试方式：

- 手动滑杆：直接控制嘴型开合，测试 `aa` expression 是否有效。
- 本地音频：上传/选择 mp3/wav，播放时用音量驱动口型。
- 后端音频：调用 `/api/v1/digitalhuman/chat`，播放返回的 `audio_url`，按句驱动口型。

第一版口型策略：

```text
Web Audio 音量分析 -> mouthOpen 0..1 -> VRM expression aa
```

如果模型没有 `aa`，要显示提示，不要崩溃。

### 4. 表情调试

提供按钮测试常见 VRM 表情：

- neutral
- happy
- angry
- sad
- relaxed
- blink
- aa
- ih
- ou
 
模型不支持某个表情时，按钮禁用或显示“不支持”。

### 5. 动画调试

- 加载 `idle_loop.vrma`。
- 支持播放/暂停待机动画。
- 动画文件不存在时显示提示，不影响模型调试。

### 6. 后端接口调试

接入现有接口：

```http
POST /api/v1/digitalhuman/chat
Content-Type: application/json
X-Tenant-Id: {tenantId}
```

请求体：

```json
{
  "session_id": "uuid",
  "content": "请介绍一下灵山胜境",
  "timestamp": 1717300000000
}
```

响应为 NDJSON：

```json
{"seq":1,"text_chunk":"欢迎来到灵山胜境。","audio_url":"/static/audio/ling_shan/xxx/0001.mp3"}
{"seq":2,"text_chunk":"这里以佛教文化和山水景观闻名。","audio_url":"/static/audio/ling_shan/xxx/0002.mp3"}
{"seq":3,"type":"end","reason":"complete"}
```

调试台要显示：

- 原始 NDJSON 日志
- 解析后的分句队列
- 当前播放句子
- 当前 audio_url
- 当前口型数值
- 接口耗时和错误信息

## 推荐目录

```text
frontend-web/
  package.json
  vite.config.ts
  tsconfig.json
  index.html
  public/
    assets/
      vrm/
        README.md
        LICENSES.md
      animations/
        README.md
      audio/
        README.md
  src/
    main.tsx
    App.tsx
    config.ts
    api/
      digitalHumanClient.ts
      types.ts
    components/
      DebugLayout.tsx
      VrmStage.tsx
      ModelPanel.tsx
      ExpressionPanel.tsx
      LipSyncPanel.tsx
      BackendPanel.tsx
      LogPanel.tsx
    features/
      audio/
        audioQueue.ts
        lipSyncAnalyser.ts
      vrm/
        VrmViewer.ts
        VrmModel.ts
        modelManifest.ts
    styles/
      app.css
  README.md
```

## 技术选型

- Vite + React + TypeScript
- three
- @pixiv/three-vrm
- Web Audio API
- fetch + ReadableStream 解析 NDJSON

不要加 Redux、路由库、大型 UI 库。调试台用普通 React state 就够。

## 环境变量

```text
VITE_AI_ENGINE_BASE_URL=http://localhost:8000
VITE_DEFAULT_TENANT_ID=ling_shan
```

如果 `audio_url` 是相对路径，前端用 `VITE_AI_ENGINE_BASE_URL` 补全。

## 模型配置

`modelManifest.ts` 示例：

```ts
export const modelManifest = [
  {
    id: "default",
    name: "导游常服",
    url: "/assets/vrm/guide-default.vrm",
    idleAnimationUrl: "/assets/animations/idle_loop.vrma"
  },
  {
    id: "hanfu",
    name: "汉服导游",
    url: "/assets/vrm/guide-hanfu.vrm",
    idleAnimationUrl: "/assets/animations/idle_loop.vrma"
  }
];
```

模型要求：

- `.vrm` 格式
- 最好支持 `blink` 和 `aa`
- 单文件尽量小于 40MB
- 授权说明写入 `public/assets/vrm/LICENSES.md`

## 调试台布局

桌面端：

```text
左侧：模型/变装/表情/口型/后端调试面板
中间：VRM 舞台
右侧：日志、NDJSON、队列、当前状态
底部：字幕和当前播放音频信息
```

移动端：

```text
上方：VRM 舞台
中间：当前字幕和状态
下方：折叠调试面板
```

## 验收标准

启动：

```powershell
cd frontend-web
npm install
npm run dev
```

打开：

```text
http://localhost:5173
```

必须满足：

- 没有 VRM 文件时页面不白屏。
- 放入 VRM 后能加载并显示模型。
- 能切换至少两个模型配置。
- 能手动滑杆控制嘴型。
- 能播放本地音频并驱动嘴型。
- 能测试常见表情按钮。
- 能调用后端 `/api/v1/digitalhuman/chat`。
- 能显示 NDJSON 原始日志。
- 能按句播放后端返回的 audio_url。
- 播放时嘴型随音量开合。
- 音频失败、模型失败、后端失败时都有错误提示。

## GitHub 上传范围

上传：

- `frontend-web/` 源码
- `frontend-web/README.md`
- `docs/frontend-web-vrm-implementation-plan.md`
- `docs/cline-frontend-web-vrm-prompt.md`

不上传：

- `node_modules/`
- `.env`
- 未授权的大体积 VRM 模型
- 生成的音频缓存

## 后续复用

调试台稳定后，再从里面抽出正式游客端页面：

- 保留 `VrmViewer`
- 保留 `audioQueue`
- 保留 `lipSyncAnalyser`
- 保留 `digitalHumanClient`
- 去掉大部分调试面板
- 换成正式 UI
