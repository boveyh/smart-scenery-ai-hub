import mysql.connector
conn = mysql.connector.connect(host='127.0.0.1', port=3307, user='root', password='root', database='smart_scenery', charset='utf8mb4')
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM t_knowledge_chunk WHERE source='csv_tourist_data'")
t = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM t_knowledge_chunk WHERE source='csv_tourist_data' AND tenant_id!='unknown'")
m = cur.fetchone()[0]
cur.execute("SELECT COUNT(DISTINCT tenant_id) FROM t_knowledge_chunk WHERE source='csv_tourist_data' AND tenant_id!='unknown'")
tid = cur.fetchone()[0]
print(f"知识分片总计: {t}")
print(f"已分配租户: {m} ({tid} 个不同租户)")
print(f"剩余 unknown: {t - m}")
cur.execute("SELECT tenant_id, COUNT(*) FROM t_knowledge_chunk WHERE source='csv_tourist_data' AND tenant_id!='unknown' GROUP BY tenant_id ORDER BY COUNT(*) DESC LIMIT 15")
print("\nTop 15 租户分布:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")
cur.close()
conn.close()
