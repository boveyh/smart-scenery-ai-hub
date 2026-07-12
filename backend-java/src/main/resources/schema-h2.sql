-- H2 兼容 schema（移除 MySQL 特有语法）

CREATE TABLE IF NOT EXISTS t_tenant (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL UNIQUE,
    name            VARCHAR(128) NOT NULL,
    description     TEXT,
    province        VARCHAR(64),
    city            VARCHAR(64),
    status          INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_poi (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    poi_id          VARCHAR(64) NOT NULL,
    name            VARCHAR(128) NOT NULL,
    category        VARCHAR(64),
    sub_category    VARCHAR(64),
    lat             DECIMAL(10,7) NOT NULL,
    lng             DECIMAL(10,7) NOT NULL,
    address         VARCHAR(256),
    description     TEXT,
    detail_content  TEXT,
    avg_stay_min    INT DEFAULT 30,
    opening_hours   VARCHAR(128),
    ticket_price    DECIMAL(10,2) DEFAULT 0,
    image_url       VARCHAR(512),
    crowdedness     INT DEFAULT 1,
    sort_order      INT DEFAULT 0,
    enabled         BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, poi_id)
);

CREATE TABLE IF NOT EXISTS t_tourist_behavior (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tourist_id      VARCHAR(32) NOT NULL,
    user_nickname   VARCHAR(64),
    age             INT,
    gender          VARCHAR(8),
    tenant_id       VARCHAR(64) NOT NULL,
    attraction_name VARCHAR(128) NOT NULL,
    poi_id          VARCHAR(64),
    visit_date      DATE NOT NULL,
    stay_duration   DECIMAL(5,1),
    ticket_cost     DECIMAL(10,2) DEFAULT 0,
    food_cost       DECIMAL(10,2) DEFAULT 0,
    shopping_cost   DECIMAL(10,2) DEFAULT 0,
    transport_cost  DECIMAL(10,2) DEFAULT 0,
    entertainment_cost DECIMAL(10,2) DEFAULT 0,
    total_cost      DECIMAL(10,2) DEFAULT 0,
    group_size      INT DEFAULT 1,
    satisfaction    INT,
    visit_hour      INT,
    is_peak_season  BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_realtime_info (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL UNIQUE,
    weather         VARCHAR(32),
    temperature     DECIMAL(4,1),
    humidity        INT,
    wind_speed      DECIMAL(4,1),
    crowdedness_level INT DEFAULT 1,
    announcements   TEXT,
    update_time     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_poi_crowdedness (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    poi_id          VARCHAR(64) NOT NULL,
    crowdedness     INT NOT NULL DEFAULT 1,
    crowd_source    VARCHAR(32) DEFAULT 'manual',
    record_time     TIMESTAMP NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_knowledge_chunk (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    chunk_id        VARCHAR(64) NOT NULL,
    poi_id          VARCHAR(64),
    title           VARCHAR(256),
    content         TEXT NOT NULL,
    tags            VARCHAR(256),
    source          VARCHAR(64),
    chunk_order     INT DEFAULT 0,
    enabled         BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tenant_id, chunk_id)
);

CREATE TABLE IF NOT EXISTS t_offline_knowledge (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    question        VARCHAR(256) NOT NULL,
    answer          TEXT NOT NULL,
    click_count     INT DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_route_history (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    route_id        VARCHAR(64) NOT NULL,
    tenant_id       VARCHAR(64) NOT NULL,
    session_id      VARCHAR(64),
    tourist_id      VARCHAR(32),
    preferences     TEXT,
    poi_sequence    TEXT NOT NULL,
    estimated_time  INT,
    actual_time     INT,
    feedback_score  INT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_digital_human_config (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL UNIQUE,
    persona_name    VARCHAR(64),
    tts_voice       VARCHAR(64) DEFAULT 'zh-CN-XiaoxiaoNeural',
    tts_rate        VARCHAR(16) DEFAULT '+0%',
    tts_pitch       VARCHAR(16) DEFAULT '+0Hz',
    face_image      VARCHAR(512),
    background_image VARCHAR(512),
    persona_prompt  TEXT,
    live2d_model    VARCHAR(64),
    costume         VARCHAR(64),
    enabled         BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_conversation_log (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    tenant_id       VARCHAR(64) NOT NULL,
    session_id      VARCHAR(64) NOT NULL,
    mode            VARCHAR(16) NOT NULL,
    user_content    TEXT NOT NULL,
    ai_content      TEXT,
    user_intent     VARCHAR(32),
    sentiment       VARCHAR(16),
    sentiment_score DECIMAL(3,2),
    topic_tag       VARCHAR(64),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
