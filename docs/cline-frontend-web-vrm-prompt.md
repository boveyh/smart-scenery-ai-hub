# 给 Cline 的数字人调试台实施提示词

把下面整段复制给 Cline 使用。

```text
你在 D:\smart-scenery-ai-hub 工作。请新增一个独立 Web 前端子项目 frontend-web，用来实现“Web VRM 数字人调试台”，不是最终游客端页面。

不要改动现有 frontend-mp、ai-engine-python、backend-java 的业务代码。只新增 frontend-web 和必要 README。

目标：
做一个专门调试数字人的前端工具，让前端同学和模型同学可以验证 VRM 模型加载、变装切换、表情、眨眼、口型、音频播放、后端 NDJSON 流式接口。基于 ChatVRM 的思路实现 three-vrm 渲染和音频驱动口型，但不要把 ChatVRM 整个仓库粗暴复制进来。

技术要求：
1. 使用 Vite + React + TypeScript。
2. 使用 three 和 @pixiv/three-vrm 渲染 VRM。
3. 使用 Web Audio API 分析当前播放音频音量，驱动 VRM 嘴型 expression，优先使用 aa。
4. 使用 fetch 读取 ai-engine-python 的 NDJSON 流式接口。
5. 不引入 Redux、路由库、大型 UI 库。
6. 页面定位是调试台，要暴露状态、日志、队列和错误信息。

请创建目录：
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

环境变量：
VITE_AI_ENGINE_BASE_URL=http://localhost:8000
VITE_DEFAULT_TENANT_ID=ling_shan

如果后端返回的 audio_url 是相对路径，例如 /static/audio/xxx.mp3，需要用 VITE_AI_ENGINE_BASE_URL 补全。

现有后端接口：
POST /api/v1/digitalhuman/chat
Headers:
  Content-Type: application/json
  X-Tenant-Id: {tenantId}

Body:
{
  "session_id": "uuid",
  "content": "用户问题",
  "timestamp": 1717300000000
}

响应是 application/x-ndjson，每行可能是：
{"seq":1,"text_chunk":"欢迎来到灵山胜境。","audio_url":"/static/audio/ling_shan/xxx/0001.mp3"}
{"seq":2,"text_chunk":"这里以佛教文化和山水景观闻名。","audio_url":"/static/audio/ling_shan/xxx/0002.mp3"}
{"seq":3,"type":"end","reason":"complete"}

功能要求：

1. App / DebugLayout
   - 左侧：调试控制面板
   - 中间：VRM 舞台
   - 右侧：日志和状态
   - 底部：当前字幕、当前音频、当前 mouthOpen 数值
   - 页面不能因为缺模型、缺动画、后端失败而白屏

2. ModelPanel
   - 从 modelManifest.ts 读取模型列表
   - 支持切换模型
   - 支持本地选择或拖拽 .vrm 文件进行临时预览
   - 显示当前模型 id/name/url/loading/error
   - 如果预置模型文件不存在，显示错误提示

3. modelManifest.ts
   - 默认写两个配置：
     /assets/vrm/guide-default.vrm
     /assets/vrm/guide-hanfu.vrm
   - 这两个文件可以不存在，但页面必须给出“请放置 VRM 文件”的提示

4. VrmViewer.ts / VrmModel.ts
   - 创建 three scene/camera/renderer
   - 加载 VRM 模型
   - 支持卸载当前模型再加载新模型
   - 每帧 update
   - 提供 setMouthOpen(value)
   - 提供 setExpression(name, value)
   - 提供 playIdleAnimation(url)，动画不存在时只记录错误，不崩
   - 自动眨眼可做简单定时器；模型不支持 blink 时不崩

5. ExpressionPanel
   - 提供按钮或滑杆测试 neutral/happy/angry/sad/relaxed/blink/aa/ih/ou
   - 如果模型不支持某个 expression，显示“不支持”或禁用按钮

6. LipSyncPanel
   - 提供嘴型手动滑杆，直接调用 setMouthOpen
   - 提供本地音频文件选择
   - 播放本地音频时，用 lipSyncAnalyser 驱动嘴型
   - 显示 mouthOpen 0..1 实时数值

7. lipSyncAnalyser.ts
   - 基于 Web Audio API
   - 接收 HTMLAudioElement
   - requestAnimationFrame 中计算音量
   - 输出 0 到 1 的 mouthOpen
   - 停止时 mouthOpen 回到 0

8. BackendPanel / digitalHumanClient.ts
   - BackendPanel 提供 tenantId 输入、问题输入、发送按钮
   - digitalHumanClient.ts 暴露 streamDigitalHumanChat(params, callbacks)
   - 负责 POST 请求、逐行解析 NDJSON、调用 onRawLine/onChunk/onEnd/onError
   - 不直接操作 React 状态
   - BackendPanel 收到 chunk 后加入 audioQueue

9. audioQueue.ts
   - 串行播放 audio_url
   - 每句播放开始时触发 onPlayItem，更新字幕和当前音频
   - 每句播放结束时触发 onEndItem
   - 播放失败时跳过当前句，继续下一句
   - 提供 clear/stop 方法
   - 播放时接入 lipSyncAnalyser，让 VRM 口型跟随音量

10. LogPanel
   - 显示原始 NDJSON 行
   - 显示解析后的分句队列
   - 显示错误日志
   - 显示后端请求耗时

11. 样式
   - 工具型调试界面，不做营销首页
   - 桌面端三栏布局
   - 移动端上下布局
   - 按钮、输入框、日志区域文字不能溢出

12. README.md
   - 写清启动命令
   - 写清 .env 配置
   - 写清模型放置位置
   - 写清如何替换/新增服装模型
   - 写清如何测试本地音频口型
   - 写清如何启动 ai-engine-python 后做真实接口测试

不要做：
1. 不要实现正式游客端复杂 UI。
2. 不要接 Wav2Lip/SadTalker。
3. 不要提交 node_modules。
4. 不要提交大体积未授权模型。
5. 不要把 API key 写进前端。

验收方式：
1. cd frontend-web
2. npm install
3. npm run dev
4. 打开 http://localhost:5173
5. 没有 VRM 文件时页面不白屏，并提示放置模型文件
6. 放入可用 VRM 后能加载模型
7. 能切换模型配置
8. 能用滑杆控制嘴型
9. 能播放本地音频并驱动嘴型
10. 能测试常见表情
11. 后端启动后，输入问题可以收到 NDJSON 分句
12. 能显示原始 NDJSON 日志
13. 收到 audio_url 后按句播放
14. 播放时嘴型跟随音量开合

实现完成后，请给出：
1. 新增文件清单
2. 启动命令
3. 已验证项
4. 未验证项和原因
```
