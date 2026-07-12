import mysql.connector
conn = mysql.connector.connect(host='127.0.0.1', port=3307, user='root', password='root', database='smart_scenery', charset='utf8mb4')
cur = conn.cursor()
cur.execute("DELETE FROM t_knowledge_chunk WHERE source='csv_tourist_data'")
print(f"Deleted {cur.rowcount} old knowledge chunks")
conn.commit()
cur.close()
conn.close()
