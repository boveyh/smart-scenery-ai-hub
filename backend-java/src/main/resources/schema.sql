-- ============================================================
-- 智慧景区 AI 导览系统 - 数据库建表脚本
-- 版本: v2.0
-- 说明: 8张核心表，覆盖多租户、POI、游客行为、
--       实时资讯、知识库、路线推荐
-- ============================================================

-- 1. 租户/景区表
CREATE TABLE IF NOT EXISTS t_tenant (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL UNIQUE COMMENT '租户编码（如 west_lake, ling_shan）',
    name            VARCHAR(128) NOT NULL COMMENT '景区名称',
    description     TEXT COMMENT '景区简介',
    province        VARCHAR(64) COMMENT '所在省份',
    city            VARCHAR(64) COMMENT '所在城市',
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '状态 1启用 0停用',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='租户/景区表';

-- 2. 景点POI表
CREATE TABLE IF NOT EXISTS t_poi (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL COMMENT '租户ID',
    poi_id          VARCHAR(64) NOT NULL COMMENT 'POI业务编码',
    name            VARCHAR(128) NOT NULL COMMENT '景点名称',
    category        VARCHAR(64) COMMENT '分类：历史文化/自然风光/主题乐园/博物馆与展馆/古镇水乡/风景名胜与休闲度假/自然公园',
    sub_category    VARCHAR(64) COMMENT '子分类（细化）',
    lat             DECIMAL(10,7) NOT NULL COMMENT '纬度',
    lng             DECIMAL(10,7) NOT NULL COMMENT '经度',
    address         VARCHAR(256) COMMENT '详细地址',
    description     TEXT COMMENT '景点简介（摘要，200字内）',
    detail_content  MEDIUMTEXT COMMENT '景点详细介绍（结构化文本）',
    avg_stay_min    INT DEFAULT 30 COMMENT '建议停留时长（分钟）',
    opening_hours   VARCHAR(128) COMMENT '开放时间',
    ticket_price    DECIMAL(10,2) DEFAULT 0 COMMENT '门票价格（0表示免费）',
    image_url       VARCHAR(512) COMMENT '封面图片URL',
    crowdedness     TINYINT DEFAULT 1 COMMENT '当前拥挤度 1-5',
    sort_order      INT DEFAULT 0 COMMENT '排序权重',
    enabled         TINYINT(1) DEFAULT 1 COMMENT '是否启用',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_poi (tenant_id, poi_id),
    INDEX idx_tenant_category (tenant_id, category),
    INDEX idx_tenant_location (tenant_id, lat, lng),
    INDEX idx_crowdedness (tenant_id, crowdedness)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='景点POI表';

-- 3. 游客行为表
CREATE TABLE IF NOT EXISTS t_tourist_behavior (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tourist_id      VARCHAR(32) NOT NULL COMMENT '游客ID',
    user_nickname   VARCHAR(64) COMMENT '游客昵称',
    age             INT COMMENT '年龄',
    gender          VARCHAR(8) COMMENT '性别 男/女',
    tenant_id       VARCHAR(64) NOT NULL COMMENT '所在景区',
    attraction_name VARCHAR(128) NOT NULL COMMENT '游览的景点名称',
    poi_id          VARCHAR(64) COMMENT '关联POI编码',
    visit_date      DATE NOT NULL COMMENT '游览日期',
    stay_duration   DECIMAL(5,1) COMMENT '停留时长（小时）',
    ticket_cost     DECIMAL(10,2) DEFAULT 0 COMMENT '门票消费',
    food_cost       DECIMAL(10,2) DEFAULT 0 COMMENT '餐饮消费',
    shopping_cost   DECIMAL(10,2) DEFAULT 0 COMMENT '购物消费',
    transport_cost  DECIMAL(10,2) DEFAULT 0 COMMENT '交通消费',
    entertainment_cost DECIMAL(10,2) DEFAULT 0 COMMENT '娱乐消费',
    total_cost      DECIMAL(10,2) DEFAULT 0 COMMENT '总消费',
    group_size      INT DEFAULT 1 COMMENT '同行人数',
    satisfaction    TINYINT COMMENT '满意度评分 1-5',
    visit_hour      TINYINT COMMENT '到访小时（0-23）',
    is_peak_season  TINYINT(1) DEFAULT 0 COMMENT '是否旺季',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tourist (tourist_id),
    INDEX idx_visit_date (visit_date),
    INDEX idx_tenant_poi (tenant_id, poi_id),
    INDEX idx_satisfaction (tenant_id, satisfaction),
    INDEX idx_cost (tenant_id, total_cost),
    INDEX idx_age_gender (age, gender)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='游客行为表';

-- 4. 实时资讯表
CREATE TABLE IF NOT EXISTS t_realtime_info (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL UNIQUE COMMENT '租户ID',
    weather         VARCHAR(32) COMMENT '天气',
    temperature     DECIMAL(4,1) COMMENT '温度（摄氏度）',
    humidity        TINYINT COMMENT '湿度百分比',
    wind_speed      DECIMAL(4,1) COMMENT '风速(m/s)',
    crowdedness_level TINYINT DEFAULT 1 COMMENT '整体拥挤等级 1-5',
    announcements   TEXT COMMENT '公告（JSON数组，如 ["今日索道检修","..."]）',
    update_time     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_update_time (update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='景区实时资讯表';

-- 5. 景点实时拥挤度明细表
CREATE TABLE IF NOT EXISTS t_poi_crowdedness (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL COMMENT '租户ID',
    poi_id          VARCHAR(64) NOT NULL COMMENT 'POI编码',
    crowdedness     TINYINT NOT NULL DEFAULT 1 COMMENT '拥挤度 1-5',
    crowd_source    VARCHAR(32) DEFAULT 'manual' COMMENT '数据来源：manual/ai_predicted/sensor',
    record_time     DATETIME NOT NULL COMMENT '记录时间',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_poi_time (tenant_id, poi_id, record_time),
    INDEX idx_time (record_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='景点实时拥挤度明细表';

-- 6. 知识库分片表
CREATE TABLE IF NOT EXISTS t_knowledge_chunk (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL COMMENT '租户ID',
    chunk_id        VARCHAR(64) NOT NULL COMMENT '分片唯一编码',
    poi_id          VARCHAR(64) COMMENT '关联POI（可选）',
    title           VARCHAR(256) COMMENT '标题/主题',
    content         TEXT NOT NULL COMMENT '知识片段内容',
    tags            VARCHAR(256) COMMENT '标签（逗号分隔，用于检索）',
    source          VARCHAR(64) COMMENT '来源（如 docs/ling_shan.docx）',
    chunk_order     INT DEFAULT 0 COMMENT '同文档内排序',
    enabled         TINYINT(1) DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_chunk (tenant_id, chunk_id),
    INDEX idx_tenant_poi (tenant_id, poi_id),
    INDEX idx_tags (tenant_id, tags(128)),
    FULLTEXT INDEX ft_content (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='知识库分片表';

-- 7. 离线FAQ表
CREATE TABLE IF NOT EXISTS t_offline_knowledge (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL COMMENT '租户ID',
    question        VARCHAR(256) NOT NULL COMMENT '常见问题',
    answer          TEXT NOT NULL COMMENT '回答',
    click_count     INT DEFAULT 0 COMMENT '被点击次数（热门排序用）',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant_question (tenant_id, question)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='离线FAQ表';

-- 8. 游览路线历史表
CREATE TABLE IF NOT EXISTS t_route_history (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    route_id        VARCHAR(64) NOT NULL COMMENT '路线唯一编码',
    tenant_id       VARCHAR(64) NOT NULL COMMENT '租户ID',
    session_id      VARCHAR(64) COMMENT '会话ID',
    tourist_id      VARCHAR(32) COMMENT '游客ID（可选，登录后关联）',
    preferences     TEXT COMMENT '偏好（JSON，兴趣/节奏/同行人）',
    poi_sequence    TEXT NOT NULL COMMENT 'POI顺序列表（JSON数组）',
    estimated_time  INT COMMENT '预估时长（分钟）',
    actual_time     INT COMMENT '实际耗时（分钟）',
    feedback_score  TINYINT COMMENT '游客评分 1-5',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tenant (tenant_id),
    INDEX idx_tourist (tourist_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='游览路线历史表';

-- 9. 数字人配置表
CREATE TABLE IF NOT EXISTS t_digital_human_config (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL UNIQUE COMMENT '租户ID',
    persona_name    VARCHAR(64) COMMENT '数字人名称',
    tts_voice       VARCHAR(64) DEFAULT 'zh-CN-XiaoxiaoNeural' COMMENT 'TTS语音',
    tts_rate        VARCHAR(16) DEFAULT '+0%' COMMENT '语速',
    tts_pitch       VARCHAR(16) DEFAULT '+0Hz' COMMENT '音调',
    face_image      VARCHAR(512) COMMENT '面部贴图URL',
    background_image VARCHAR(512) COMMENT '背景贴图URL',
    persona_prompt  TEXT COMMENT '人设提示词',
    live2d_model    VARCHAR(64) COMMENT 'Live2D模型ID',
    costume         VARCHAR(64) COMMENT '服装',
    enabled         TINYINT(1) DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='数字人配置表';

-- 10. 对话记录表
CREATE TABLE IF NOT EXISTS t_conversation_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL COMMENT '租户ID',
    session_id      VARCHAR(64) NOT NULL COMMENT '会话ID',
    mode            VARCHAR(16) NOT NULL COMMENT '模式：text/digital_human',
    user_content    TEXT NOT NULL COMMENT '用户输入',
    ai_content      TEXT COMMENT 'AI回复',
    user_intent     VARCHAR(32) COMMENT '用户意图分类',
    sentiment       VARCHAR(16) COMMENT '情感：positive/neutral/negative',
    sentiment_score DECIMAL(3,2) COMMENT '情感分数 0-1',
    topic_tag       VARCHAR(64) COMMENT '话题标签',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conv_tenant (tenant_id),
    INDEX idx_conv_session (session_id),
    INDEX idx_conv_created (created_at),
    INDEX idx_conv_sentiment (tenant_id, sentiment)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='对话记录表';

-- ============================================================
-- 初始数据已迁移至 DataInitializer.java 管理
-- ============================================================
-- 注意：schema.sql 仅负责建表，不包含初始数据，
-- 所有初始化数据由 DataInitializer (CommandLineRunner) 统一管理。
