# 智慧景区导览系统 - 接口文档 v2.0（轻量化音视解耦版）
> 本文档定义了前后端及AI模块之间的所有数据契约。**必须严格遵守**，任何修改需在Apifox中更新并通知全队。

## 目录
- [1. 通用约定](#1-通用约定)
- [2. 极速文本模式接口（WebSocket）](#2-极速文本模式接口websocket)
- [3. 数字人模式接口（HTTP流式，音视解耦核心）](#3-数字人模式接口http-流式音视解耦核心)
- [4. HTTP通用接口（RESTful）](#4-http-通用接口restful)
- [5. 管理后台接口（SaaS，仅管理员）](#5-管理后台接口saas仅管理员)
- [6. 敏感词过滤与安全围栏](#6-敏感词过滤与安全围栏)
- [7. 错误码定义](#7-错误码定义)
- [8. 数据字段规范（统一）](#8-数据字段规范统一)
- [9. 版本与更新记录](#9-版本与更新记录)
> 落地备注：前端（成员C）、后端（成员A）、Mock开发（成员B）分工约束详见文档末尾

## 1. 通用约定
1. **字符编码**：全局统一 `UTF-8`
2. **HTTP接口**：默认请求头 `Content-Type: application/json`，文件上传接口除外
3. **WebSocket接口**：仅极速文本模式使用，纯文本协议，单条消息为JSON；服务端流式返回采用 `NDJSON` 格式，多条JSON以换行符 `\n` 分隔
4. **数字人模式**：废弃WebSocket，采用**HTTP长流式POST**，响应为NDJSON流，单行为单句文本+独立音频URL，前端自主控制视频切换，实现音视解耦
5. **多租户携带规则**
    - HTTP：请求头 `X-Tenant-Id: {tenant_id}`
    - WebSocket：连接Query参数 `?tenant_id={tenant_id}`
6. **会话标识**：全接口必传 `session_id`（前端生成UUID），用于多轮对话上下文存储
7. **时间戳**：统一使用**毫秒级Unix时间戳（number类型）**

## 2. 极速文本模式接口（WebSocket）
### 2.1 连接地址
```
wss://api-domain/ws/chat?tenant_id={tenant_id}&session_id={session_id}&mode=text
```

### 2.2 客户端 → 服务端 下行消息格式
| action | 说明 | 附加字段 |
| ---- | ---- | ---- |
| `send_message` | 发送用户输入（纯文本/语音转文本） | `content: string` |
| `heartbeat` | 心跳保活，客户端每30s上报一次 | 无额外字段 |

**消息示例**
```json
{
  "action": "send_message",
  "content": "雷峰塔的建造历史",
  "timestamp": 1717300000000
}
```

### 2.3 服务端 → 客户端 上行流式响应（NDJSON）
服务端逐行返回JSON，前端按换行切割逐行解析，末尾`end`标记会话结束。
```json
{"type": "text", "content": "第一段文字", "seq": 1}
{"type": "text", "content": "第二段文字", "seq": 2}
{"type": "end", "reason": "complete", "usage": {"tokens": 123}}
```
**字段说明**
| 字段 | 取值说明 |
| ---- | ---- |
| type | `text`：增量文本分片；`end`：对话结束 |
| content | AI分段回复文本 |
| seq | 自增分片序号，用于前端乱序纠错 |
| reason | 结束原因：`complete`正常结束 / `timeout`超时 / `error`异常 |
| usage | 消耗token统计，仅end节点返回 |

## 3. 数字人模式接口（HTTP 流式，音视解耦核心）
> 核心规则：后端做**句级文本切片**，单句生成独立MP3音频并上传OSS生成公网URL，流式返回`text_chunk+audio_url`，前端根据音频播放状态切换数字人视频。

### 3.1 请求信息
- 请求地址：`POST /api/v1/digitalhuman/chat`
- 请求头
```http
Content-Type: application/json
X-Tenant-Id: {tenant_id}
```
- 请求Body
```json
{
  "session_id": "uuid-xxxx",
  "content": "请介绍一下苏堤春晓",
  "timestamp": 1717300000000
}
```

### 3.2 响应规则
- `Content-Type: application/x-ndjson`，流式逐行返回
- 正常分片行：携带单句文本+音频链接；结束行：type=end标记对话终止
```json
{"seq":1, "text_chunk": "苏堤春晓是西湖十景之首。", "audio_url": "https://cdn.example.com/ttf/abc123.mp3"}
{"seq":2, "text_chunk": "它由北宋诗人苏轼主持修建。", "audio_url": "https://cdn.example.com/ttf/abc124.mp3"}
{"seq":3, "type": "end", "reason": "complete"}
```

### 3.3 前端交互规范
1. 按`seq`顺序使用``组件串行播放`audio_url`，同步展示`text_chunk`字幕；
2. 音频`onPlay`触发：数字人由`idle.mp4`空闲视频切为`speaking.mp4`说话视频；
3. 音频`onEnded`触发：切回`idle.mp4`；
4. 音频加载失败/超时：降级纯文本展示，不切换视频资源。

## 4. HTTP 通用接口（RESTful）
> 基础路由前缀：`/api/v1`；全接口必须携带请求头 `X-Tenant-Id`

### 4.1 获取景点POI列表
- 请求方式：`GET /pois`
- Query可选参数：`lat`、`lng`（传入后按地理距离由近到远排序）
- 返回示例
```json
{
  "code": 200,
  "data": [
    {
      "poi_id": "poi_001",
      "name": "雷峰塔",
      "category": "历史文化",
      "lat": 30.232,
      "lng": 120.146,
      "description": "雷峰塔建于公元977年...",
      "avg_stay_min": 45,
      "crowdedness": 2
    }
  ]
}
```

### 4.2 个性化游览路线推荐（错峰调度）
- 请求方式：`POST /route/recommend`
- 请求Body
```json
{
  "preferences": {
    "interest": "历史文化",
    "pace": "relaxed",
    "companions": "with_children",
    "duration_min": 180
  },
  "start_poi_id": "entrance_01"
}
```
- 返回示例
```json
{
  "code": 200,
  "data": {
    "route_id": "route_001",
    "poi_sequence": ["poi_001", "poi_003", "poi_005"],
    "estimated_time_min": 165,
    "tips": ["推荐先去雷峰塔，10点后人流较大"]
  }
}
```

### 4.3 拍照识物（多模态视觉问答）
- 请求方式：`POST /vision/recognize`
- 传参格式：`Content-Type: multipart/form-data`
- 表单字段：`image`(图片文件，必传)、`question`(自定义查询问题，可选)
- 返回示例
```json
{
  "code": 200,
  "data": {
    "object": "荷花",
    "confidence": 0.96,
    "description": "荷花是中国传统名花，出淤泥而不染..."
  }
}
```

### 4.4 景区实时资讯（天气/人流/公告）
- 请求方式：`GET /info/realtime`
- 返回示例
```json
{
  "code": 200,
  "data": {
    "weather": "晴",
    "temperature": 28,
    "crowdedness_level": 3,
    "peak_pois": ["poi_001"],
    "announcements": ["今日索道检修，请步行上山"]
  }
}
```

### 4.5 离线知识库（弱网前端本地缓存）
- 请求方式：`GET /knowledge/offline`
- 返回：键值对FAQ数据，前端缓存用于AI服务不可用时降级兜底
```json
{
  "code": 200,
  "data": {
    "厕所在哪里": "前方50米右转",
    "门票多少钱": "全价80元，学生半价"
  }
}
```

## 5. 管理后台接口（SaaS，仅管理员）
> 基础路由前缀：`/api/admin`；全接口必须携带请求头 `X-Tenant-Id`

### 5.1 知识库文档上传（Word/PDF）
- 请求方式：`POST /knowledge/upload`
- 传参格式：`Content-Type: multipart/form-data`
- 表单字段：`file`(知识库文档)
- 返回示例
```json
{"code":200,"message":"解析中"}
```

### 5.2 POI景点批量配置
- 请求方式：`POST /poi/batch`
- 请求Body
```json
{
  "pois": [
    {"poi_id": "poi_001", "name": "雷峰塔", "lat": 30.232, "lng": 120.146}
  ]
}
```

### 5.3 服务资源监控（算力/会话Mock数据）
- 请求方式：`GET /monitor/metrics`
- 返回示例
```json
{
  "code": 200,
  "data": {
    "cpu_usage": 45.2,
    "memory_usage_mb": 2048,
    "active_sessions": 128,
    "digitalhuman_sessions": 3
  }
}
```

### 5.4 模拟客流注入（错峰算法调试用）
- 请求方式：`POST /simulate/crowd`
- 请求Body
```json
{
  "poi_id": "poi_001",
  "crowdedness": 5,
  "timestamp": 1717300000000
}
```

## 6. 敏感词过滤与安全围栏
1. 过滤逻辑：**入参+AI出参双向校验**，后端通过AC自动机实现敏感词拦截；
2. 拦截返回格式：
```json
{"type": "error", "code": 400, "message": "内容包含敏感词，请重新输入"}
```

## 7. 错误码定义
| 错误码 | 含义 | 前端处理逻辑 |
| ---- | ---- | ---- |
| 200 | 业务成功 | 正常解析返回数据 |
| 400 | 参数错误 / 命中敏感词 | 弹窗提示用户修改输入内容 |
| 401 | 租户ID非法/租户失效 | 引导重新登录/景区扫码授权 |
| 429 | 接口限流，请求频繁 | 提示「请求过快，请稍后再试」 |
| 500 | 后端服务内部异常 | 降级离线知识库/纯文本提示报错 |
| 503 | AI服务宕机/调用超时 | 自动切极速文本模式，读取本地离线知识库 |
| 504 | 网关请求超时 | 同503降级逻辑 |

## 8. 数据字段规范（统一）
| 字段名 | 数据类型 | 说明 | 示例 |
| ---- | ---- | ---- | ---- |
| tenant_id | string | 景区租户唯一编码 | west_lake |
| session_id | string | 用户会话唯一UUID | f47ac10b-58cc-xxxx |
| interactive_mode | string | 交互模式：text/digital_human | digital_human |
| content | string | 用户提问原始文本/AI整段回复 | 雷峰塔的故事由来 |
| text_chunk | string | 数字人专用：单句切片文本 | 苏堤春晓是西湖十景之首。 |
| audio_url | string | 临时音频公网OSS地址 | https://cdn.example.com/ttf/xxx.mp3 |

## 9. 版本与更新记录
| 版本 | 更新日期 | 修改内容 | 修改人 |
| ---- | ---- | ---- | ---- |
| v2.0 | 2026-06-03 | 重构数字人链路：移除实时视频流，改为HTTP流式+句级TTS生成独立音频URL、音视解耦架构 | 项目团队 |

---
### 开发落地备注
1. **前端(成员C)**：数字人页面使用``标签播放`audio_url`，监听播放事件完成`idle.mp4 ↔ speaking.mp4`视频切换；
2. **后端(成员A)**：实现AI回复句级分句切割、对接edge-tts生成MP3、音频上传OSS生成临时公网URL、NDJSON流式输出；
3. **Mock开发(成员B)**：所有接口Mock返回严格遵循本文档JSON结构、音频URL字段格式规范。