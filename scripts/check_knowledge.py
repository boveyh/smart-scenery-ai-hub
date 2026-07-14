import mysql.connector
conn = mysql.connector.connect(host='127.0.0.1', port=3307, user='root', password='root', database='smart_scenery', charset='utf8mb4')
cur = conn.cursor()
cur.execute("SELECT COUNT(*) FROM t_knowledge_chunk WHERE source='csv_tourist_data'")
total = cur.fetchone()[0]
print(f"知识分片总数: {total}")
cur.execute("SELECT COUNT(*) FROM (SELECT title FROM t_knowledge_chunk WHERE source='csv_tourist_data' GROUP BY title) t")
titles = cur.fetchone()[0]
print(f"景点数: {titles}")
cur.execute("SELECT AVG(LENGTH(content)) FROM t_knowledge_chunk WHERE source='csv_tourist_data'")
avg = cur.fetchone()[0]
print(f"平均分片长度(字符): {int(avg)}")
cur.execute("SELECT title, COUNT(*) FROM t_knowledge_chunk WHERE source='csv_tourist_data' GROUP BY title ORDER BY COUNT(*) DESC LIMIT 10")
print("\n分片最多的10个景点:")
for r in cur.fetchall():
    print(f"  {r[0]}: {r[1]}")
cur.close()
conn.close()
