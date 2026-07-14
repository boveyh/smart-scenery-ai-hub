"""
使用精确匹配更新 t_knowledge_chunk 的 tenant_id。
title 字段可能是 "历史沿革：景点名..." 格式，
用 LIKE 匹配景点名关键词。
"""
import mysql.connector

DB_CONFIG = {
    "host": "127.0.0.1",
    "port": 3307,
    "user": "root",
    "password": "root",
    "database": "smart_scenery",
    "charset": "utf8mb4",
}

NAME_TENANT_LIST = [
    ("宁波方特", "ningbo_fangte"),
    ("中国航海博物馆", "china_navigation_museum"),
    ("苏州乐园", "suzhou_forest"),
    ("顾村公园", "gucun_park"),
    ("清名桥", "qingmingqiao"),
    ("豫园", "yuyuan"),
    ("周庄", "zhouzhuang"),
    ("朱家角", "zhujiajiao"),
    ("上海野生动物园", "shanghai_wildlife"),
    ("上海海昌", "shanghai_haichang"),
    ("上海海洋水族馆", "shanghai_aquarium"),
    ("上海宝山", "baoshan_art"),
    ("上海博物馆", "shanghai_museum"),
    ("杭州宋城", "hangzhou_songcheng"),
    ("荡口古镇", "dangkou"),
    ("西塘古镇", "xitang"),
    ("同里古镇", "tongli"),
    ("闵行文化公园", "minhang_park"),
    ("上海科技馆", "shanghai_science"),
    ("上海欢乐谷", "shanghai_happyvalley"),
    ("锦江乐园", "jinjiang_park"),
    ("兰亭", "lanting"),
    ("老外滩", "old_foreign_beach"),
    ("雷峰塔", "leifeng_pagoda"),
    ("金鸡湖", "jinji_lake"),
    ("黎里古镇", "lili"),
    ("乌镇", "wuzhen"),
    ("拙政园", "zhuozheng_yuan"),
    ("西湖", "west_lake"),
    ("西溪湿地", "west_lake"),
    ("灵山", "ling_shan"),
    ("尚湖", "west_lake"),
    ("虞山", "west_lake"),
    ("沙家浜", "west_lake"),
    ("寒山寺", "suzhou_forest"),
    ("山塘街", "suzhou_forest"),
    ("平江路", "suzhou_forest"),
    ("盘门", "suzhou_forest"),
    ("枫泾古镇", "shanghai_jinshan"),
    ("东林寺", "shanghai_jinshan"),
    ("金山嘴", "shanghai_jinshan"),
    ("金山城市沙滩", "shanghai_jinshan"),
    ("花开海上", "shanghai_jinshan"),
    ("上海之巅", "shanghai_pudong"),
    ("东方明珠", "shanghai_pudong"),
    ("金茂大厦", "shanghai_pudong"),
    ("世纪公园", "shanghai_pudong"),
    ("杜莎夫人", "shanghai_huangpu"),
    ("城市规划展示馆", "shanghai_huangpu"),
    ("中共一大", "shanghai_huangpu"),
    ("中共二大", "shanghai_huangpu"),
    ("中共四大", "shanghai_hongkou"),
    ("犹太难民", "shanghai_hongkou"),
    ("吴淞炮台湾", "shanghai_baoshan"),
    ("玻璃博物馆", "shanghai_baoshan"),
    ("共青森林公园", "shanghai_yangpu"),
    ("国际时尚中心", "shanghai_yangpu"),
    ("辰山植物园", "shanghai_songjiang"),
    ("广富林", "shanghai_songjiang"),
    ("佘山", "shanghai_songjiang"),
    ("月湖雕塑", "shanghai_songjiang"),
    ("蓝精灵", "shanghai_songjiang"),
    ("醉白池", "shanghai_songjiang"),
    ("方塔园", "shanghai_songjiang"),
    ("上海影视乐园", "shanghai_songjiang"),
    ("大观园", "shanghai_qingpu"),
    ("东方绿舟", "shanghai_qingpu"),
    ("陈云", "shanghai_qingpu"),
    ("四季花港", "shanghai_qingpu"),
    ("比斯特", "shanghai_qingpu"),
    ("薰衣草公园", "shanghai_pudong"),
    ("奇迹花园", "shanghai_pudong"),
    ("上海植物园", "shanghai_xuhui"),
    ("宋庆龄故居", "shanghai_xuhui"),
    ("龙华烈士", "shanghai_xuhui"),
    ("上海动物园", "shanghai_changning"),
    ("长风公园", "shanghai_putuo"),
    ("甪直", "suzhou_luzhi"),
    ("木渎", "suzhou_mudu"),
    ("千灯古镇", "suzhou_qiandeng"),
    ("锦溪", "suzhou_jinxi"),
    ("亭林园", "suzhou_kunshan"),
    ("鼋头渚", "wuxi_yuantouzhu"),
    ("惠山古镇", "wuxi_huishan"),
    ("蠡园", "wuxi_liyuan"),
    ("梅园", "wuxi_meiyuan"),
    ("拈花湾", "wuxi_nianhua"),
    ("三国水浒", "wuxi_film"),
    ("莫干山", "huzhou_moganshan"),
    ("南浔", "huzhou_nanxun"),
    ("梅花洲", "jiaxing_meihua"),
    ("绮园", "jiaxing_qiyuan"),
    ("盐官", "jiaxing_yanguan"),
    ("云澜湾", "jiaxing_yunlanwan"),
    ("天一阁", "ningbo_tianyige"),
    ("慈城", "ningbo_cicheng"),
    ("普陀山", "zhoushan_putuoshan"),
    ("朱家尖", "zhoushan_zhujiajian"),
    ("嵊泗", "zhoushan_shengsi"),
    ("花鸟岛", "zhoushan_huaniao"),
    ("碧海金沙", "zhoushan_bihai"),
    ("柯岩", "shaoxing_keyan"),
    ("鲁迅故里", "shaoxing_luxun"),
    ("沈园", "shaoxing_shenyuan"),
    ("安昌古镇", "shaoxing_anchang"),
    ("东平国家森林公园", "shanghai_chongming"),
    ("东滩湿地", "shanghai_chongming"),
    ("西沙明珠湖", "shanghai_chongming"),
    ("海上花岛", "shanghai_chongming"),
    ("长兴岛郊野", "shanghai_changxing"),
    ("江南三民", "shanghai_chongming"),
    ("高家庄生态园", "shanghai_chongming"),
    ("七宝古镇", "shanghai_minhang"),
    ("召稼楼", "shanghai_minhang"),
    ("南翔古镇", "shanghai_jiading"),
    ("古猗园", "shanghai_jiading"),
    ("州桥老街", "shanghai_jiading"),
    ("汽车博览公园", "shanghai_jiading"),
    ("多伦路", "shanghai_hongkou"),
    ("闻道园", "shanghai_baoshan"),
    ("武康路", "shanghai_xuhui"),
    ("徐家汇源", "shanghai_xuhui"),
    ("南京路步行街", "shanghai_huangpu"),
    ("老城隍庙", "shanghai_huangpu"),
    ("外滩万国", "shanghai_huangpu"),
    ("人民广场", "shanghai_huangpu"),
    ("上海大剧院", "shanghai_huangpu"),
    ("闵行文化公园", "shanghai_minhang"),
    ("滴水湖", "shanghai_pudong"),
    ("临港", "shanghai_pudong"),
    ("迪士尼", "shanghai_disney"),
    ("苏州太湖", "suzhou_forest"),
    ("上方山", "suzhou_forest"),
    ("虎丘", "suzhou_forest"),
    ("狮子林", "suzhou_forest"),
    ("留园", "suzhou_forest"),
    ("网师园", "suzhou_forest"),
    ("苏州乐园森林世界", "suzhou_forest"),
    ("杭州Hello Kitty", "hangzhou_hello_kitty"),
    ("京杭大运河杭州", "hangzhou_canal"),
    ("海宁", "jiaxing_yanguan"),
    ("象山影视城", "ningbo_xiangshan"),
    ("东湖", "jiaxing_donghu"),
    ("南湖景区", "jiaxing_nanhu"),
    ("梅花洲", "jiaxing_meihua"),
    ("南北湖", "jiaxing_nanbei"),
]

def main():
    conn = mysql.connector.connect(**DB_CONFIG)
    cur = conn.cursor()

    total_updated = 0
    for keyword, tenant_id in NAME_TENANT_LIST:
        try:
            cur.execute("""
                UPDATE ignore t_knowledge_chunk SET tenant_id = %s
                WHERE source = 'csv_tourist_data' AND tenant_id = 'unknown'
                  AND (title LIKE %s OR content LIKE %s)
            """, (tenant_id, f"%{keyword}%", f"%{keyword}%"))
            if cur.rowcount > 0:
                total_updated += cur.rowcount
                print(f"  {keyword} → {tenant_id}: {cur.rowcount}")
            conn.commit()
        except Exception as e:
            conn.rollback()
            print(f"  {keyword} → {tenant_id}: 失败 {e}")

    # 最后统计
    cur.execute("SELECT COUNT(*) FROM t_knowledge_chunk WHERE source='csv_tourist_data' AND tenant_id='unknown'")
    still_unknown = cur.fetchone()[0]
    cur.execute("SELECT COUNT(DISTINCT tenant_id) FROM t_knowledge_chunk WHERE source='csv_tourist_data' AND tenant_id != 'unknown'")
    tenant_count = cur.fetchone()[0]
    print(f"\n本次更新: {total_updated} 条")
    print(f"剩余 unknown: {still_unknown}")
    print(f"已分配的租户数: {tenant_count}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
