# Live2D 模型和 SDK 资源目录

## 目录结构

```
assets/live2d/
├── cubism-sdk/              ← Live2D Cubism SDK for Web
│   ├── Core/
│   │   └── live2dcubismcore.min.js
│   └── Framework/
│       └── live2dcubismframework.min.js
├── Haru/                    ← 示例模型
│   ├── Haru.model3.json
│   ├── Haru.moc3
│   ├── textures/
│   ├── motions/
│   └── expressions/
├── Hiyori/                  ← 示例模型
│   ├── Hiyori.model3.json
│   └── ...
└── README.md
```

## 手动下载步骤

### 1. 下载 Live2D Cubism SDK for Web

- **官方下载**：https://www.live2d.com/download/cubism-sdk/
  - 注册 Live2D 账号（免费）
  - 下载 **Cubism SDK for Web**（CubismSdkForWeb-5-r.1.zip）
- **Github镜像**：https://github.com/Live2D/CubismWebSamples
- **备选CDN**：https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js

### 2. 解压 SDK 并放置文件

解压后，将以下文件复制到指定位置：

| 源文件（SDK zip内） | 目标位置 |
|---|---|
| `Core/live2dcubismcore.min.js` | `frontend-web/public/assets/live2d/cubism-sdk/Core/live2dcubismcore.min.js` |
| `Framework/dist/live2dcubismframework.min.js` | `frontend-web/public/assets/live2d/cubism-sdk/Framework/live2dcubismframework.min.js` |

### 3. 下载免费示例模型

- **下载地址**：https://www.live2d.com/download/sample-data/
- 推荐下载 **Haru** 和 **Hiyori** 模型
- 解压后完整放置到对应的模型目录下

### 4. 最终验证

确认文件存在：

```powershell
# 检查 SDK
ls frontend-web/public/assets/live2d/cubism-sdk/Core/live2dcubismcore.min.js
ls frontend-web/public/assets/live2d/cubism-sdk/Framework/live2dcubismframework.min.js

# 检查模型（至少一个）
ls frontend-web/public/assets/live2d/Haru/Haru.model3.json
```

### 5. 启动调试

```powershell
cd frontend-web
npm install
npm run dev
```

打开 http://localhost:5173 即可看到 Live2D 数字人调试台。