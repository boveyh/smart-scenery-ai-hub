"""
从 t_knowledge_chunk 中提取所有 unique title（景点名），
与 ATTRACTION_TENANT_MAP 匹配后更新 tenant_id。
未匹配的景点名输出到控制台，方便补充映射。
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

ATTRACTION_TENANT_MAP = {
    "宁波方特东方神画": "ningbo_fangte",
    "中国航海博物馆": "china_navigation_museum",
    "苏州乐园森林世界": "suzhou_forest",
    "顾村公园": "gucun_park",
    "清名桥古运河景区": "qingmingqiao",
    "豫园": "yuyuan",
    "周庄": "zhouzhuang",
    "朱家角古镇景区": "zhujiajiao",
    "上海野生动物园": "shanghai_wildlife",
    "上海海昌海洋公园": "shanghai_haichang",
    "上海海洋水族馆": "shanghai_aquarium",
    "上海宝山国际民间艺术博览馆": "baoshan_art",
    "上海博物馆": "shanghai_museum",
    "杭州宋城": "hangzhou_songcheng",
    "荡口古镇": "dangkou",
    "西塘古镇": "xitang",
    "同里古镇": "tongli",
    "闵行文化公园": "minhang_park",
    "上海科技馆": "shanghai_science",
    "上海欢乐谷": "shanghai_happyvalley",
    "锦江乐园": "jinjiang_park",
    "兰亭景区": "lanting",
    "老外滩": "old_foreign_beach",
    "雷峰塔": "leifeng_pagoda",
    "金鸡湖": "jinji_lake",
    "黎里古镇": "lili",
    "乌镇": "wuzhen",
    "拙政园": "zhuozheng_yuan",
    "西湖风景名胜区": "west_lake",
    "西溪国家湿地公园": "west_lake",
    "灵山胜境": "ling_shan",
    "灵山大佛": "ling_shan",
    "尚湖风景区": "west_lake",
    "虞山景区": "west_lake",
    "沙家浜风景区": "west_lake",
    "苏州太湖国家湿地公园": "suzhou_forest",
    "苏州上方山国家森林公园": "suzhou_forest",
    "虎丘山风景名胜区": "suzhou_forest",
    "狮子林": "suzhou_forest",
    "留园": "suzhou_forest",
    "网师园": "suzhou_forest",
    "拙政园": "suzhou_forest",
    "寒山寺": "suzhou_forest",
    "山塘街": "suzhou_forest",
    "平江路历史街区": "suzhou_forest",
    "盘门景区": "suzhou_forest",
    "枫泾古镇": "shanghai_jinshan",
    "东林寺": "shanghai_jinshan",
    "金山嘴渔村": "shanghai_jinshan",
    "金山城市沙滩": "shanghai_jinshan",
    "花开海上生态园": "shanghai_jinshan",
    "上海之巅观光厅": "shanghai_pudong",
    "东方明珠": "shanghai_pudong",
    "金茂大厦": "shanghai_pudong",
    "上海海洋水族馆": "shanghai_pudong",
    "上海环球金融中心": "shanghai_pudong",
    "上海科技馆": "shanghai_pudong",
    "世纪公园": "shanghai_pudong",
    "上海野生动物园": "shanghai_pudong",
    "上海迪士尼度假区": "shanghai_disney",
    "上海杜莎夫人蜡像馆": "shanghai_huangpu",
    "上海城市规划展示馆": "shanghai_huangpu",
    "上海博物馆": "shanghai_huangpu",
    "上海大剧院": "shanghai_huangpu",
    "中国共产党第一次全国代表大会会址": "shanghai_huangpu",
    "中国共产党第二次全国代表大会会址纪念馆": "shanghai_huangpu",
    "中共四大纪念馆": "shanghai_hongkou",
    "上海犹太难民纪念馆": "shanghai_hongkou",
    "上海宝山国际民间艺术博览馆": "shanghai_baoshan",
    "吴淞炮台湾湿地森林公园": "shanghai_baoshan",
    "上海玻璃博物馆": "shanghai_baoshan",
    "顾村公园": "shanghai_baoshan",
    "上海共青森林公园": "shanghai_yangpu",
    "上海国际时尚中心": "shanghai_yangpu",
    "上海辰山植物园": "shanghai_songjiang",
    "广富林文化遗址": "shanghai_songjiang",
    "上海欢乐谷": "shanghai_songjiang",
    "泰会生活文化园": "shanghai_songjiang",
    "上海佘山国家森林公园": "shanghai_songjiang",
    "月湖雕塑公园": "shanghai_songjiang",
    "蓝精灵乐园-上海世茂精灵之城主题乐园": "shanghai_songjiang",
    "醉白池": "shanghai_songjiang",
    "方塔园": "shanghai_songjiang",
    "上海影视乐园": "shanghai_songjiang",
    "上海大观园": "shanghai_qingpu",
    "朱家角古镇景区": "shanghai_qingpu",
    "东方绿舟景区": "shanghai_qingpu",
    "陈云纪念馆": "shanghai_qingpu",
    "上海四季花港": "shanghai_qingpu",
    "比斯特上海购物村": "shanghai_qingpu",
    "上海薰衣草公园": "shanghai_pudong",
    "上海奇迹花园": "shanghai_pudong",
    "上海植物园": "shanghai_xuhui",
    "上海宋庆龄故居纪念馆": "shanghai_xuhui",
    "上海龙华烈士陵园": "shanghai_xuhui",
    "上海动物园": "shanghai_changning",
    "长风公园": "shanghai_putuo",
    "苏州乐园森林世界": "suzhou_forest",
    "同里古镇": "suzhou_tongli",
    "周庄": "suzhou_zhouzhuang",
    "甪直古镇": "suzhou_luzhi",
    "木渎古镇": "suzhou_mudu",
    "千灯古镇": "suzhou_qiandeng",
    "锦溪古镇": "suzhou_jinxi",
    "亭林园": "suzhou_kunshan",
    "黎里古镇": "suzhou_wujiang",
    "荡口古镇": "wuxi_dangkou",
    "灵山胜境": "wuxi_ling_shan",
    "灵山大佛": "wuxi_ling_shan",
    "禅意小镇·拈花湾": "wuxi_nianhua",
    "三国水浒景区(中央电视台无锡影视基地)": "wuxi_film",
    "无锡市太湖鼋头渚风景区": "wuxi_yuan touzhu",
    "清名桥古运河景区": "wuxi_qingmingqiao",
    "惠山古镇": "wuxi_huishan",
    "蠡园": "wuxi_liyuan",
    "梅园": "wuxi_meiyuan",
    "东林书院": "wuxi_donglin",
    "宜兴竹海": "wuxi_zhuhai",
    "善卷洞": "wuxi_shanjuan",
    "杭州宋城": "hangzhou_songcheng",
    "西湖风景名胜区": "hangzhou_westlake",
    "雷峰塔": "hangzhou_leifeng",
    "西溪国家湿地公园": "hangzhou_xixi",
    "梅家坞": "hangzhou_meijiawu",
    "京杭大运河杭州景区": "hangzhou_canal",
    "杭州Hello Kitty乐园": "hangzhou_hello kitty",
    "湘湖": "hangzhou_xianghu",
    "莫干山风景名胜区": "huzhou_moganshan",
    "南浔古镇": "huzhou_nanxun",
    "乌镇": "jiaxing_wuzhen",
    "西塘古镇": "jiaxing_xitang",
    "梅花洲": "jiaxing_meihua",
    "绮园景区": "jiaxing_qiyuan",
    "海宁盐官旅游度假区": "jiaxing_yanguan",
    "云澜湾温泉": "jiaxing_yunlanwan",
    "东湖景区": "jiaxing_donghu",
    "宁波方特东方神画": "ningbo_fangte",
    "宁波海天一洲景区": "ningbo_haitian",
    "天一阁博物院": "ningbo_tianyige",
    "天一阁·月湖景区": "ningbo_tianyige",
    "老外滩": "ningbo_oldbund",
    "慈城古县城": "ningbo_cicheng",
    "象山影视城": "ningbo_xiangshan",
    "普陀山风景区": "zhoushan_putuoshan",
    "朱家尖风景区": "zhoushan_zhujiajian",
    "桃花岛": "zhoushan_taohua",
    "嵊泗列岛风景名胜区": "zhoushan_shengsi",
    "花鸟岛": "zhoushan_huaniao",
    "碧海金沙": "zhoushan_bihai",
    "东极岛": "zhoushan_dongji",
    "绍兴柯岩风景区": "shaoxing_keyan",
    "鲁迅故里": "shaoxing_luxun",
    "沈园": "shaoxing_shenyuan",
    "兰亭景区": "shaoxing_lanting",
    "安昌古镇": "shaoxing_anchang",
    "新昌大佛寺": "shaoxing_dafosi",
    "五泄风景区": "shaoxing_wuxie",
    "金华双龙洞": "jinhua_shuanglong",
    "横店影视城": "jinhua_hengdian",
    "诸葛八卦村": "jinhua_zhuge",
    "仙华山": "jinhua_xianhua",
    "中国航海博物馆": "shanghai_navigation",
    "上海海昌海洋公园": "shanghai_haichang",
    "上海科技馆": "shanghai_science",
    "上海自然博物馆": "shanghai_natural",
    "上海海洋水族馆": "shanghai_aquarium",
    "上海杜莎夫人蜡像馆": "shanghai_madam",
    "中国四大佛教名山": "buddhist_mountains",
    "中国共产党第一次全国代表大会会址": "shanghai_red",
    "中国共产党第二次全国代表大会会址纪念馆": "shanghai_red",
    "中共四大纪念馆": "shanghai_red",
    "陈云故里": "shanghai_red",
    "陈云纪念馆": "shanghai_red",
    "上海犹太难民纪念馆": "shanghai_jewish",
    "上海城市规划展示馆": "shanghai_urban",
    "上海影视乐园": "shanghai_film",
    "上海国际赛车场": "shanghai_f1",
    "上海都市菜园": "shanghai_farm",
    "上海海湾国家森林公园": "shanghai_fengxian",
    "上海薰衣草公园": "shanghai_pudong",
    "高家庄生态园": "shanghai_chongming",
    "东平国家森林公园": "shanghai_chongming",
    "东滩湿地公园": "shanghai_chongming",
    "西沙明珠湖景区": "shanghai_chongming",
    "海上花岛前卫村景区": "shanghai_chongming",
    "长兴岛郊野公园": "shanghai_changxing",
    "江南三民文化村": "shanghai_chongming",
    "上海奇迹花园": "shanghai_pudong",
    "上海薰衣草公园": "shanghai_pudong",
    "上海共青森林公园": "shanghai_yangpu",
    "上海动物园": "shanghai_changning",
    "上海野生动物园": "shanghai_pudong",
    "上海辰山植物园": "shanghai_songjiang",
    "上海植物园": "shanghai_xuhui",
    "上海大观园": "shanghai_qingpu",
    "东方绿舟景区": "shanghai_qingpu",
    "广富林文化遗址": "shanghai_songjiang",
    "上海佘山国家森林公园": "shanghai_songjiang",
    "月湖雕塑公园": "shanghai_songjiang",
    "金山城市沙滩": "shanghai_jinshan",
    "枫泾古镇": "shanghai_jinshan",
    "东林寺": "shanghai_jinshan",
    "金山嘴渔村": "shanghai_jinshan",
    "花开海上生态园": "shanghai_jinshan",
    "闵行文化公园": "shanghai_minhang",
    "韩湘水博园": "shanghai_minhang",
    "浦江郊野公园": "shanghai_minhang",
    "七宝古镇": "shanghai_minhang",
    "召稼楼古镇": "shanghai_minhang",
    "南翔古镇": "shanghai_jiading",
    "古猗园": "shanghai_jiading",
    "州桥老街": "shanghai_jiading",
    "秋霞圃": "shanghai_jiading",
    "汽车博览公园": "shanghai_jiading",
    "上海保利大剧院": "shanghai_jiading",
    "上海犹太难民纪念馆": "shanghai_hongkou",
    "多伦路文化名人街": "shanghai_hongkou",
    "鲁迅公园": "shanghai_hongkou",
    "上海宝山国际民间艺术博览馆": "shanghai_baoshan",
    "吴淞炮台湾湿地森林公园": "shanghai_baoshan",
    "上海玻璃博物馆": "shanghai_baoshan",
    "闻道园": "shanghai_baoshan",
    "上海宋庆龄故居纪念馆": "shanghai_xuhui",
    "武康路历史文化名街": "shanghai_xuhui",
    "龙华烈士陵园": "shanghai_xuhui",
    "上海植物园": "shanghai_xuhui",
    "徐家汇源": "shanghai_xuhui",
    "上海国际时尚中心": "shanghai_yangpu",
    "上海共青森林公园": "shanghai_yangpu",
    "中国武术博物馆": "shanghai_yangpu",
    "上海城市规划展示馆": "shanghai_huangpu",
    "上海博物馆": "shanghai_huangpu",
    "上海杜莎夫人蜡像馆": "shanghai_huangpu",
    "豫园": "shanghai_huangpu",
    "老城隍庙": "shanghai_huangpu",
    "外滩": "shanghai_huangpu",
    "外滩万国建筑博览群": "shanghai_huangpu",
    "南京路步行街": "shanghai_huangpu",
    "人民广场": "shanghai_huangpu",
    "上海大剧院": "shanghai_huangpu",
    "上海音乐厅": "shanghai_huangpu",
    "锦江乐园": "shanghai_minhang",
    "莘庄公园": "shanghai_minhang",
    "上海玛雅海滩水公园": "shanghai_songjiang",
    "上海世茂深坑酒店": "shanghai_songjiang",
    "佘山天文台": "shanghai_songjiang",
    "佘山圣母大殿": "shanghai_songjiang",
    "泰晤士小镇": "shanghai_songjiang",
    "车墩影视基地": "shanghai_songjiang",
    "南汇嘴观海公园": "shanghai_pudong",
    "临港滴水湖": "shanghai_pudong",
    "上海鲜花港": "shanghai_pudong",
    "世纪公园": "shanghai_pudong",
    "上海科技馆": "shanghai_pudong",
    "上海海洋水族馆": "shanghai_pudong",
    "上海东方艺术中心": "shanghai_pudong",
    "上海之巅观光厅": "shanghai_pudong",
    "金茂大厦": "shanghai_pudong",
    "东方明珠": "shanghai_pudong",
    "上海环球金融中心": "shanghai_pudong",
    "上海中心大厦": "shanghai_pudong",
    "上海野生动物园": "shanghai_pudong",
    "上海迪士尼度假区": "shanghai_disney",
    "上海奕欧来奥特莱斯": "shanghai_disney",
    "佛罗伦萨小镇": "shanghai_disney",
    "周浦花海": "shanghai_pudong",
    "上海薰衣草公园": "shanghai_pudong",
    "上海奇迹花园": "shanghai_pudong",
}

def main():
    conn = mysql.connector.connect(**DB_CONFIG)
    cur = conn.cursor()

    # 获取所有 unique title（景点名）且 tenant_id = unknown
    cur.execute("""
        SELECT DISTINCT title FROM t_knowledge_chunk
        WHERE source = 'csv_tourist_data' AND tenant_id = 'unknown'
    """)
    unknown_titles = [r[0] for r in cur.fetchall()]
    print(f"当前 unknown 租户的景点数: {len(unknown_titles)}")

    matched = 0
    unmatched = []
    for title in unknown_titles:
        # 从 ATTRACTION_TENANT_MAP 中匹配
        tenant_id = None
        for name, tid in ATTRACTION_TENANT_MAP.items():
            if name in title or title in name:
                tenant_id = tid
                break
        if tenant_id:
            try:
                cur.execute(
                    "UPDATE t_knowledge_chunk SET tenant_id = %s WHERE source = 'csv_tourist_data' AND title = %s AND tenant_id = 'unknown'",
                    (tenant_id, title)
                )
                matched += cur.rowcount
            except Exception as e:
                if "Duplicate entry" in str(e):
                    print(f"  跳过重复: {title}")
                else:
                    raise
        else:
            # 提取景点名：去掉标题中的说明文字，取第一个景点名
            unmatched.append(title)

    conn.commit()

    print(f"已匹配更新: {matched} 条")
    print(f"\n未匹配的景点 ({len(unmatched)}):")
    for name in sorted(set(unmatched)):
        print(f"  {name}")

    # 最终统计
    cur.execute("SELECT COUNT(*) FROM t_knowledge_chunk WHERE source='csv_tourist_data' AND tenant_id='unknown'")
    still_unknown = cur.fetchone()[0]
    print(f"\n剩余 unknown: {still_unknown}")
    cur.execute("SELECT COUNT(DISTINCT tenant_id) FROM t_knowledge_chunk WHERE source='csv_tourist_data' AND tenant_id != 'unknown'")
    tenant_count = cur.fetchone()[0]
    print(f"已分配的租户数: {tenant_count}")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
