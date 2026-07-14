# 灵山胜境 3D 智慧导览地图模块

基于高德地图 JS API 2.0 的景区 3D 智慧导览，覆盖灵山胜境 16 个核心景点，支持点位标记、信息弹窗和快速定位。

## 文件结构

```
map/
├── index.html          # 主页面（独立运行或 iframe 嵌入）
├── scenic-spots.json   # 16 个景点的结构化数据
├── jpg/                # 景点图片（ls-001.jpg ~ ls-016.jpg）
│   ├── ls-001.jpg      # 灵山大照壁
│   ├── ls-002.jpg      # 五明桥
│   ├── ...
│   └── ls-016.jpg      # 无尽意斋
└── README.md
```

## 技术栈

- 高德地图 JS API v2.0
- 纯 HTML/CSS/JavaScript（无框架依赖）
- 3D 视角 + 控件栏 + 比例尺 + 拖拽范围限制

## 快速接入

### 方式一：iframe 嵌入（推荐）

将整个 `map/` 文件夹部署到静态资源服务器，然后通过 iframe 引用：

```html
<iframe
  src="/map/index.html"
  width="100%"
  height="600px"
  frameborder="0"
  allowfullscreen
></iframe>
```

### 方式二：直接部署

将 `map/` 文件夹放置到项目的 `public/` 或 `static/` 目录下，确保 `index.html` 与 `jpg/`、`scenic-spots.json` 的相对路径不变。

### 方式三：组件化集成

可直接复制 `index.html` 中的 HTML 结构、CSS 样式和 JS 逻辑到你的 Vue/React 组件中。核心地图初始化代码见下方。

## 配置高德地图凭证

在 `index.html` 中找到以下两处占位符，替换为你的高德地图应用凭证：

```html
<!-- 1. API Key -->
<script src="https://webapi.amap.com/maps?v=2.0&key=YOUR_AMAP_KEY&plugin=AMap.ControlBar,AMap.ToolBar,AMap.Scale"></script>

<!-- 2. 安全密钥（JS Code） -->
<script>
  window._AMapSecurityConfig = {
    securityJsCode: "YOUR_AMAP_SECURITY_CODE"
  };
</script>
```

获取方式：
1. 登录 [高德开放平台](https://console.amap.com/dev/)
2. 创建应用 → 添加 Key → 选择"Web端(JS API)"平台
3. 在「安全模式」中获取 JS Code 安全密钥
4. 在应用管理中将你的部署域名加入白名单

## 景点数据（scenic-spots.json）

包含 16 个景点的完整信息，字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，格式 `LS-001` ~ `LS-016` |
| `name` | string | 景点中文名称 |
| `description` | string | 景点描述文字 |
| `openingInfo` | string | 开放时间 / 演出场次 |
| `lng` | number | 高德坐标系经度（GCJ-02） |
| `lat` | number | 高德坐标系纬度（GCJ-02） |
| `coordinateLevel` | string | 坐标可信度（均为 `verified`） |
| `coordinateNote` | string | 坐标来源说明 |
| `image` | string | 图片相对路径，如 `./jpg/ls-001.jpg` |
| `imageTitle` | string | 图片标题 |
| `imageSource` | string | 图片版权来源 |

### 前端直接加载

```javascript
// 方式一：fetch 远程 JSON
fetch('/map/scenic-spots.json')
  .then(res => res.json())
  .then(data => console.log(data));

// 方式二：如果你将数据内联到了 HTML 中，直接从 DOM 读取
const scenicSpots = JSON.parse(
  document.getElementById('scenicSpotsData').textContent
);
```

## 地图配置项

在 `index.html` 的 `<script>` 中可调整以下参数：

```javascript
// 地图中心点 [lng, lat]
const SCENIC_CENTER = [120.1005, 31.426];

// 初始视角范围
const SCENIC_BOUNDS = new AMap.Bounds(
  new AMap.LngLat(120.0957, 31.4207),  // 西南角
  new AMap.LngLat(120.1053, 31.431)    // 东北角
);

// 拖拽限制范围（防止用户拖出景区）
const DRAG_BOUNDS = new AMap.Bounds(
  new AMap.LngLat(120.092, 31.4185),
  new AMap.LngLat(120.1085, 31.433)
);

// 地图初始化参数
const map = new AMap.Map('container', {
  viewMode: '3D',       // 3D 模式
  zoom: 16,             // 初始缩放级别
  zooms: [16, 19],      // 缩放范围限制
  pitch: 58,            // 俯仰角
  rotation: -18,        // 旋转角
  center: SCENIC_CENTER,
  rotateEnable: true,
  pitchEnable: true,
  showBuildingBlock: true,
  mapStyle: 'amap://styles/normal',
});
```

## 交互功能

| 交互方式 | 行为 |
|----------|------|
| 点击左侧列表项 | 地图飞行定位到该景点（zoom:18, pitch:62），弹出信息窗口 |
| 点击地图标记点 | 弹出信息窗口（含图片、描述、坐标来源） |
| 地图控件栏 | 支持 3D/2D 切换、旋转、缩放 |

## 响应式适配

已在 CSS 中内置移动端断点（≤760px）：

- 布局从上下的并排变为上下堆叠
- 地图高度固定为 42vh
- 侧边栏列表取消最大高度限制

## 注意事项

1. **坐标系统**：所有坐标使用高德 GCJ-02 坐标系，不要使用 WGS-84 原始坐标
2. **域名白名单**：部署到生产环境前，务必在高德控制台将域名加入白名单，否则地图会加载失败
3. **图片路径**：景点图片引用使用相对路径 `./jpg/ls-XXX.jpg`，部署时保持 `jpg/` 目录与 `index.html` 的相对关系不变
4. **https 要求**：高德 JS API 要求通过 HTTPS 或 localhost 访问