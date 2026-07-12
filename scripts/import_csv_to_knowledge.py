"""
从景点景区旅游数据行为分析数据.csv 提取景点详细描述，
按段落/标题切分为知识分片，写入 t_knowledge_chunk 表。

用法：
  cd D:\Projects_for_study\smart-scenery-ai-hub
  python scripts\import_csv_to_knowledge.py
"""

import csv
import re
import hashlib
import mysql.connector
from collections import OrderedDict

CSV_PATH = r"C:\Users\34955\Downloads\景点景区旅游数据行为分析数据.csv"

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3307,
    "user": "root",
    "password": "root",
    "database": "smart_scenery",
    "charset": "utf8mb4",
}

# 景点名称 → tenantId 映射
ATTRACTION_TENANT_MAP = OrderedDict([
    ("宁波方特东方神画", "ningbo_fangte"),
    ("中国航海博物馆", "china_navigation_museum"),
    ("苏州乐园森林世界", "suzhou_forest"),
    ("顾村公园", "gucun_park"),
    ("清名桥古运河景区", "qingmingqiao"),
    ("豫园", "yuyuan"),
    ("周庄", "zhouzhuang"),
    ("朱家角古镇景区", "zhujiajiao"),
    ("上海野生动物园", "shanghai_wildlife"),
    ("上海海昌海洋公园", "shanghai_haichang"),
    ("上海海洋水族馆", "shanghai_aquarium"),
    ("上海宝山国际民间艺术博览馆", "baoshan_art"),
    ("上海博物馆", "shanghai_museum"),
    ("杭州宋城", "hangzhou_songcheng"),
    ("荡口古镇", "dangkou"),
    ("西塘古镇", "xitang"),
    ("同里古镇", "tongli"),
    ("闵行文化公园", "minhang_park"),
    ("上海科技馆", "shanghai_science"),
    ("上海欢乐谷", "shanghai_happyvalley"),
    ("锦江乐园", "jinjiang_park"),
    ("兰亭景区", "lanting"),
    ("老外滩", "old_foreign_beach"),
    ("雷峰塔", "leifeng_pagoda"),
    ("金鸡湖", "jinji_lake"),
    ("黎里古镇", "lili"),
    ("乌镇", "wuzhen"),
    ("拙政园", "zhuozheng_yuan"),
])

# 标记关键词，用于段落切分
SPLIT_PATTERNS = [
    r"一、",
    r"二、",
    r"三、",
    r"四、",
    r"五、",
    r"六、",
    r"七、",
    r"八、",
    r"（一）",
    r"（二）",
    r"（三）",
    r"（四）",
    r"（五）",
    r"1\.\s",
    r"2\.\s",
    r"3\.\s",
    r"4\.\s",
    r"5\.\s",
    r"6\.\s",
    r"①\s",
    r"②\s",
    r"③\s",
    r"核心亮点",
    r"必玩项目",
    r"文化内涵",
    r"建筑特色",
    r"历史渊源",
]

def match_tenant(attraction_name):
    for name, tenant_id in ATTRACTION_TENANT_MAP.items():
        if name in attraction_name or attraction_name in name:
            return tenant_id
    return "unknown"

def chunk_content(content, title_prefix=""):
    """按标题/段落切分长文本为多个知识片"""
    if not content or len(content) < 20:
        return []

    # 按双换行切分
    paragraphs = re.split(r"\n\s*\n", content)
    chunks = []

    for para in paragraphs:
        para = para.strip()
        if len(para) < 30:
            continue

        # 提取段落标题
        para_title = title_prefix
        for pat in SPLIT_PATTERNS:
            m = re.search(pat, para)
            if m:
                # 取匹配后的下一段文字作为标题
                after = para[m.end():].strip()
                para_title = after[:40] if len(after) > 40 else after
                break

        # 如果段落仍然过长 (>1500字)，进一步按句号切
        if len(para) > 1500:
            sub_sentences = re.split(r"(?<=[。！？])", para)
            buffer = ""
            for sent in sub_sentences:
                if len(buffer) + len(sent) < 1000:
                    buffer += sent
                else:
                    if buffer.strip() and len(buffer.strip()) > 30:
                        chunks.append((para_title, buffer.strip()))
                    buffer = sent
            if buffer.strip() and len(buffer.strip()) > 30:
                chunks.append((para_title, buffer.strip()))
        else:
            chunks.append((para_title, para))

    return chunks

def main():
    print(f"读取 CSV: {CSV_PATH}")

    # 按景点聚合内容
    attractions = OrderedDict()  # name -> {content, type}
    with open(CSV_PATH, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = (row.get("attraction_name") or "").strip()
            content = (row.get("attraction_content") or "").strip()
            a_type = (row.get("attraction_type") or "").strip()
            if not name:
                continue
            # 合并相同景点的不同行内容（去重）
            if name not in attractions:
                attractions[name] = {"content": "", "type": a_type}
            # 如果新内容不包含已有内容才追加
            existing = attractions[name]["content"]
            if content and content not in existing:
                attractions[name]["content"] += "\n\n" + content if existing else content
            if a_type and not attractions[name]["type"]:
                attractions[name]["type"] = a_type

    print(f"共发现 {len(attractions)} 个景点")

    # 连接数据库
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()

    total_chunks = 0
    for name, info in attractions.items():
        tenant_id = match_tenant(name)
        content = info["content"]
        if not content:
            print(f"  ⚠  {name}: 无内容, 跳过")
            continue

        # 切分知识片
        chunks = chunk_content(content, name)
        if not chunks:
            # 如果无法切分，整段作为一个知识片
            chunks = [(name, content)]

        print(f"  {name} ({tenant_id}): {len(chunks)} 个知识片")

        for idx, (title, chunk_text) in enumerate(chunks):
            chunk_id = hashlib.md5(chunk_text[:100].encode()).hexdigest()[:16]
            tags = info["type"] if info["type"] else "景点介绍"

            try:
                cursor.execute(
                    """INSERT IGNORE INTO t_knowledge_chunk
                       (tenant_id, chunk_id, poi_id, title, content, tags, source, chunk_order)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    (tenant_id, f"csv_{chunk_id}", None,
                     title[:256] if title else name,
                     chunk_text, tags, "csv_tourist_data", idx)
                )
                if cursor.rowcount > 0:
                    total_chunks += 1
            except Exception as e:
                print(f"    插入失败: {e}")

        conn.commit()

    cursor.close()
    conn.close()
    print(f"\n✅ 导入完成: 共 {total_chunks} 个知识片写入 t_knowledge_chunk 表")

if __name__ == "__main__":
    main()
