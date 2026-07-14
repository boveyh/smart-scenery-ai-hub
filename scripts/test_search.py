import mysql.connector
conn = mysql.connector.connect(host='127.0.0.1', port=3307, user='root', password='root', database='smart_scenery', charset='utf8mb4')
cur = conn.cursor()

tests = [
    ("shanghai_huangpu", "豫园", "玉玲珑"),
    ("west_lake", "西湖", "苏堤"),
    ("suzhou_forest", "苏州乐园", "过山车"),
    ("jiaxing_wuzhen", "乌镇", "西栅"),
]
for tenant, name, keyword in tests:
    cur.execute("SELECT COUNT(*) FROM t_knowledge_chunk WHERE tenant_id=%s", (tenant,))
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM t_knowledge_chunk WHERE tenant_id=%s AND content LIKE %s", (tenant, f"%{keyword}%"))
    like_cnt = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM t_knowledge_chunk WHERE tenant_id=%s AND MATCH(content) AGAINST(%s IN BOOLEAN MODE)", (tenant, keyword))
    match_cnt = cur.fetchone()[0]
    print(f"{name} ({tenant}): total={total}, LIKE '{keyword}'={like_cnt}, MATCH='{keyword}'={match_cnt}")

cur.close()
conn.close()
