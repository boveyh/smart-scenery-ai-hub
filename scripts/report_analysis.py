"""
游客感受度报告分析脚本
处理 景点景区旅游数据行为分析数据.csv，生成 JSON 报告供前端展示
"""

import pandas as pd
import json
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
CSV_PATH = os.path.join(PROJECT_DIR, "景点景区旅游数据行为分析数据.csv")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "ai-engine-python", "data")
OUTPUT_PATH = os.path.join(OUTPUT_DIR, "report_analysis.json")

os.makedirs(OUTPUT_DIR, exist_ok=True)

print(f"正在加载 CSV ({CSV_PATH})...")
df = pd.read_csv(CSV_PATH, dtype={"tourist_id": str})
print(f"已加载 {len(df):,} 条记录, {df['tourist_id'].nunique():,} 位游客")

# 年龄分层
df["age_group"] = pd.cut(
    df["age"], bins=[0, 18, 30, 45, 60, 150],
    labels=["0-18", "19-30", "31-45", "46-60", "60+"]
)

# 停留时长分层
stay_bins = [0, 2, 4, 6, 8, 10, 100]
stay_labels = ["0-2h", "2-4h", "4-6h", "6-8h", "8-10h", "10h+"]
df["stay_group"] = pd.cut(df["stay_duration"], bins=stay_bins, labels=stay_labels)

# 消费分层
cost_bins = [0, 100, 300, 500, 1000, 2000, 50000]
cost_labels = ["0-100", "100-300", "300-500", "500-1000", "1000-2000", "2000+"]

# 满意度分段
sat_bins = [0, 2, 3, 4, 5]
sat_labels = ["低(1-2)", "中(3)", "高(4)", "极高(5)"]
df["sat_level"] = pd.cut(df["satisfaction"], bins=sat_bins, labels=sat_labels)

# ===== 构建报告 =====

# 1. 概况
total = len(df)
avg_sat = float(df["satisfaction"].mean())
result = {
    "overview": {
        "total_records": total,
        "unique_tourists": int(df["tourist_id"].nunique()),
        "avg_satisfaction": round(avg_sat, 2),
        "avg_stay_hours": round(float(df["stay_duration"].mean()), 1),
        "avg_total_cost": round(float(df["total_cost"].mean()), 0),
        "avg_group_size": round(float(df["group_size"].mean()), 1),
        "male_ratio": round(float((df["gender"] == "男").mean() * 100), 1),
        "female_ratio": round(float((df["gender"] == "女").mean() * 100), 1),
    },
}

# 2. 满意度分布
result["satisfaction_dist"] = (
    df["satisfaction"].value_counts().sort_index().apply(int).to_dict()
)
# 填充缺失的分数
for s in range(1, 6):
    result["satisfaction_dist"].setdefault(s, 0)

# 3. 年龄分布 + 满意度
age_stats = df.groupby("age_group").agg(
    count=("satisfaction", "count"),
    avg_sat=("satisfaction", "mean"),
    avg_cost=("total_cost", "mean"),
    avg_stay=("stay_duration", "mean"),
)
result["age_gender"] = {}
for ag in age_stats.index:
    ag_data = df[df["age_group"] == ag]
    gender_dist = ag_data["gender"].value_counts(normalize=True).to_dict()
    result["age_gender"][str(ag)] = {
        "count": int(age_stats.loc[ag, "count"]),
        "avg_sat": round(float(age_stats.loc[ag, "avg_sat"]), 2),
        "avg_cost": round(float(age_stats.loc[ag, "avg_cost"]), 0),
        "avg_stay": round(float(age_stats.loc[ag, "avg_stay"]), 1),
        "male_pct": round(float(gender_dist.get("男", 0)) * 100, 1),
        "female_pct": round(float(gender_dist.get("女", 0)) * 100, 1),
    }

# 4. 停留时长分布
stay_stats = df.groupby("stay_group").agg(
    count=("satisfaction", "count"),
    avg_sat=("satisfaction", "mean"),
    avg_cost=("total_cost", "mean"),
)
result["stay_analysis"] = [
    {
        "hours": str(k),
        "count": int(v["count"]),
        "avg_sat": round(float(v["avg_sat"]), 2),
        "avg_cost": round(float(v["avg_cost"]), 0),
    }
    for k, v in stay_stats.iterrows()
]

# 5. 消费结构
result["cost_breakdown"] = {
    k: {"avg": round(float(df[k].mean()), 0), "total": round(float(df[k].sum()), 0)}
    for k in ["ticket_cost", "food_cost", "shopping_cost", "transport_cost", "entertainment_cost"]
}

# 6. 同行人数与满意度的关系
group_stats = df.groupby("group_size").agg(
    count=("satisfaction", "count"),
    avg_sat=("satisfaction", "mean"),
    avg_cost=("total_cost", "mean"),
)
result["group_analysis"] = [
    {
        "size": int(k),
        "count": int(v["count"]),
        "avg_sat": round(float(v["avg_sat"]), 2),
        "avg_cost": round(float(v["avg_cost"]), 0),
    }
    for k, v in group_stats.iterrows()
]

# 7. 消费分层与满意度的关系
df["cost_group"] = pd.cut(df["total_cost"], bins=cost_bins, labels=cost_labels)
cost_sat = df.groupby("cost_group").agg(
    count=("satisfaction", "count"),
    avg_sat=("satisfaction", "mean"),
)
result["cost_tier_analysis"] = [
    {
        "tier": str(k),
        "count": int(v["count"]),
        "avg_sat": round(float(v["avg_sat"]), 2),
    }
    for k, v in cost_sat.iterrows()
]

# 8. 趋势（按年龄的满意度趋势）
result["satisfaction_trend"] = [
    {"age_group": str(k), "avg_sat": round(float(v["avg_sat"]), 2)}
    for k, v in age_stats.sort_index().iterrows()
]

# 9. 服务建议
suggestions = []
low_sat_count = int((df["satisfaction"] <= 2).sum())
if low_sat_count > 0:
    suggestions.append(f"低满意度记录(评分≤2)共{low_sat_count}条，占比{low_sat_count/total*100:.1f}%，需重点关注")

# 各年龄组的低满意度分析
for ag in age_stats.index:
    ag_df = df[df["age_group"] == ag]
    ag_low = ag_df[ag_df["satisfaction"] <= 2]
    if len(ag_low) > 0.05 * len(ag_df):
        suggestions.append(
            f"{ag}年龄段游客低满意度占比"
            f"{len(ag_low)/len(ag_df)*100:.0f}%，"
            f"建议优化该群体服务体验"
        )

# 高消费但满意度低
high_cost = df[df["total_cost"] > df["total_cost"].quantile(0.9)]
high_cost_sat = high_cost["satisfaction"].mean()
if high_cost_sat < avg_sat:
    suggestions.append(
        f"高消费群体(前10%)满意度({high_cost_sat:.1f})低于平均({avg_sat:.1f})，"
        f"建议提升高端服务品质"
    )

# 团队游客满意度
group_sat = df[df["group_size"] >= 5]["satisfaction"].mean()
if group_sat < avg_sat:
    suggestions.append(
        f"团队游客(5人+)满意度({group_sat:.1f})低于均值，"
        f"建议优化团队接待流程和讲解服务"
    )

# 停留时间短的满意度
short_stay = df[df["stay_duration"] < 2]
if len(short_stay) > 0.05 * total:
    short_sat = short_stay["satisfaction"].mean()
    if short_sat < avg_sat:
        suggestions.append(
            f"短时停留游客(<2h)满意度({short_sat:.1f})偏低，"
            f"建议优化入口导览和快速体验路线"
        )

# 各消费项占比用于建议
cost_pct = {
    k: round(float(df[k].sum() / df["total_cost"].sum() * 100), 1)
    for k in ["ticket_cost", "food_cost", "shopping_cost", "transport_cost", "entertainment_cost"]
}
max_cost = max(cost_pct, key=cost_pct.get)
if cost_pct[max_cost] > 40:
    suggestions.append(
        f"{dict(ticket_cost='门票',food_cost='餐饮',shopping_cost='购物',transport_cost='交通',entertainment_cost='娱乐')[max_cost]}消费占比{cost_pct[max_cost]}%，"
        f"建议提供更多性价比选择"
    )

result["suggestions"] = suggestions

# 10. 话题热词（固定，实际可用NLP提取）
result["topic_hotwords"] = [
    {"word": "门票价格", "count": 0, "sentiment": 0},
    {"word": "排队时间", "count": 0, "sentiment": 0},
    {"word": "餐饮品质", "count": 0, "sentiment": 0},
    {"word": "导览讲解", "count": 0, "sentiment": 0},
    {"word": "停车便利", "count": 0, "sentiment": 0},
    {"word": "环境卫生", "count": 0, "sentiment": 0},
]

# 写文件
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

import sys
sys.stdout.reconfigure(encoding='utf-8')
print(f"[OK] Report generated -> {OUTPUT_PATH}")
print(f"  records: {result['overview']['total_records']:,}")
print(f"  tourists: {result['overview']['unique_tourists']:,}")
print(f"  avg sat: {result['overview']['avg_satisfaction']}")
print(f"  avg stay: {result['overview']['avg_stay_hours']}h")
print(f"  avg cost: {result['overview']['avg_total_cost']}")
print(f"  suggestions: {len(suggestions)}")
for s in suggestions:
    print(f"  - {s}")
