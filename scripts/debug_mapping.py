import mysql.connector
conn = mysql.connector.connect(host='127.0.0.1', port=3307, user='root', password='root', database='smart_scenery', charset='utf8mb4')
cur = conn.cursor()

# 检查豫园实际在哪
cur.execute("SELECT tenant_id, COUNT(*) FROM t_knowledge_chunk WHERE content LIKE '%豫园%' AND source='csv_tourist_data' GROUP BY tenant_id")
print("豫园分布:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

# 检查西湖
cur.execute("SELECT tenant_id, COUNT(*) FROM t_knowledge_chunk WHERE content LIKE '%西湖%' AND source='csv_tourist_data' GROUP BY tenant_id")
print("\n西湖分布:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")

# 查看 knowledge search 的调用接口
cur.execute("SELECT content FROM t_knowledge_chunk WHERE content LIKE '%过山车%' AND source='csv_tourist_data' LIMIT 1")
row = cur.fetchone()
if row:
    print(f"\n过山车内容预览: {row[0][:100]}")

cur.close()
conn.close()
