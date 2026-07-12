import mysql.connector
conn = mysql.connector.connect(host='127.0.0.1', port=3307, user='root', password='root', database='smart_scenery', charset='utf8mb4')
cur = conn.cursor()
cur.execute("SHOW INDEX FROM t_knowledge_chunk WHERE Key_name = 'ft_content'")
idx = cur.fetchone()
print(f"FULLTEXT index exists: {idx is not None}")
cur.execute("SELECT COUNT(*) FROM t_knowledge_chunk")
total = cur.fetchone()[0]
print(f"Total rows: {total}")
cur.execute("SELECT COUNT(*) FROM t_knowledge_chunk WHERE content LIKE '%西湖%'")
like = cur.fetchone()[0]
print(f"LIKE 西湖: {like}")
cur.execute("SELECT COUNT(*) FROM t_knowledge_chunk WHERE MATCH(content) AGAINST('西湖' IN BOOLEAN MODE)")
match = cur.fetchone()[0]
print(f"MATCH 西湖: {match}")
# 检查 ft_min_word_len
cur.execute("SHOW VARIABLES LIKE 'ft_min_word_len'")
for r in cur.fetchall():
    print(f"ft_min_word_len: {r[1]}")
# 检查 ngram
cur.execute("SHOW VARIABLES LIKE 'ngram_token_size'")
for r in cur.fetchall():
    print(f"ngram_token_size: {r[1]}")
cur.close()
conn.close()
