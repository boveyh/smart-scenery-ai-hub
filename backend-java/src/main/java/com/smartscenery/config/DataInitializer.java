package com.smartscenery.config;

import com.smartscenery.entity.*;
import com.smartscenery.repository.*;
import com.smartscenery.util.JsonUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * 数据初始化器 — 启动时预置演示数据
 */
@Slf4j
@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private PoiRepository poiRepository;
    @Autowired
    private RealtimeInfoRepository realtimeInfoRepository;
    @Autowired
    private OfflineKnowledgeRepository offlineKnowledgeRepository;
    @Autowired
    private TenantRepository tenantRepository;

    @Override
    public void run(String... args) {
        if (poiRepository.count() > 0) {
            log.info("数据库已有数据，跳过初始化");
            return;
        }

        log.info("初始化演示数据...");

        // ─── 租户数据 ────────────────────────────────────
        List<Tenant> tenants = Arrays.asList(
                Tenant.builder().tenantId("west_lake").name("西湖景区").description("杭州西湖，中国首批国家重点风景名胜区，世界文化遗产").province("浙江").city("杭州").build(),
                Tenant.builder().tenantId("ningbo_fangte").name("宁波方特东方神画").description("以中国传统文化为核心的科技主题乐园").province("浙江").city("宁波").build(),
                Tenant.builder().tenantId("china_navigation_museum").name("中国航海博物馆").description("中国唯一国家级航海博物馆").province("上海").city("上海").build(),
                Tenant.builder().tenantId("suzhou_forest").name("苏州乐园森林世界").description("全新一代森林主题休闲娱乐王国").province("江苏").city("苏州").build(),
                Tenant.builder().tenantId("gucun_park").name("顾村公园").description("上海最大樱花观赏地").province("上海").city("上海").build(),
                Tenant.builder().tenantId("qingmingqiao").name("清名桥古运河景区").description("运河绝版地，江南水弄堂").province("江苏").city("无锡").build(),
                Tenant.builder().tenantId("yuyuan").name("豫园").description("东南名园冠，国家5A级旅游景区").province("上海").city("上海").build(),
                Tenant.builder().tenantId("zhouzhuang").name("周庄古镇").description("中国第一水乡，国家5A级旅游景区").province("江苏").city("苏州").build(),
                Tenant.builder().tenantId("zhujiajiao").name("朱家角古镇").description("上海四大历史文化名镇之一").province("上海").city("上海").build(),
                Tenant.builder().tenantId("ling_shan").name("灵山胜境").description("无锡灵山胜境，国家5A级旅游景区，佛教文化圣地").province("江苏").city("无锡").build()
        );
        tenantRepository.saveAll(tenants);
        log.info("已初始化 {} 个租户", tenants.size());

        // ─── POI 景点数据 ────────────────────────────────
        String wl = "west_lake";
        List<Poi> pois = Arrays.asList(
                Poi.builder().tenantId(wl).poiId("poi_001").name("断桥残雪").category("自然风光").lat(new BigDecimal("30.2610000")).lng(new BigDecimal("120.1500000")).description("断桥位于杭州西湖白堤的东端，背靠宝石山。传说《白蛇传》中许仙与白娘子在此相遇。").avgStayMin(20).crowdedness(3).openingHours("全天开放").ticketPrice(BigDecimal.ZERO).sortOrder(1).build(),
                Poi.builder().tenantId(wl).poiId("poi_002").name("苏堤春晓").category("自然风光").lat(new BigDecimal("30.2560000")).lng(new BigDecimal("120.1380000")).description("苏堤是北宋苏轼疏浚西湖时构筑而成，全长约3公里，为'西湖十景'之首。").avgStayMin(40).crowdedness(2).openingHours("全天开放").ticketPrice(BigDecimal.ZERO).sortOrder(2).build(),
                Poi.builder().tenantId(wl).poiId("poi_003").name("雷峰塔").category("历史文化").lat(new BigDecimal("30.2320000")).lng(new BigDecimal("120.1460000")).description("雷峰塔始建于北宋977年，因《白蛇传》传说闻名。").avgStayMin(45).crowdedness(4).openingHours("08:00-20:00").ticketPrice(new BigDecimal("80")).sortOrder(3).build(),
                Poi.builder().tenantId(wl).poiId("poi_004").name("曲院风荷").category("自然风光").lat(new BigDecimal("30.2530000")).lng(new BigDecimal("120.1270000")).description("曲院风荷位于西湖西侧，以夏日荷花盛景闻名。").avgStayMin(30).crowdedness(2).openingHours("全天开放").ticketPrice(BigDecimal.ZERO).sortOrder(4).build(),
                Poi.builder().tenantId(wl).poiId("poi_005").name("三潭印月").category("自然风光").lat(new BigDecimal("30.2450000")).lng(new BigDecimal("120.1430000")).description("西湖中最大岛屿，建有三座石塔。").avgStayMin(35).crowdedness(3).openingHours("08:00-17:00").ticketPrice(new BigDecimal("55")).sortOrder(5).build(),
                Poi.builder().tenantId(wl).poiId("poi_006").name("花港观鱼").category("休闲娱乐").lat(new BigDecimal("30.2400000")).lng(new BigDecimal("120.1330000")).description("花港观鱼位于西湖西南角，红鱼池中放养数万尾金鳞红鲤。").avgStayMin(25).crowdedness(2).openingHours("全天开放").ticketPrice(BigDecimal.ZERO).sortOrder(6).build(),
                Poi.builder().tenantId(wl).poiId("poi_007").name("灵隐寺").category("历史文化").lat(new BigDecimal("30.2440000")).lng(new BigDecimal("120.1010000")).description("灵隐寺始建于东晋326年，杭州最早名刹。").avgStayMin(60).crowdedness(3).openingHours("07:00-18:00").ticketPrice(new BigDecimal("75")).sortOrder(7).build(),
                Poi.builder().tenantId(wl).poiId("poi_008").name("西湖游船").category("休闲娱乐").lat(new BigDecimal("30.2580000")).lng(new BigDecimal("120.1420000")).description("乘船游览西湖是体验湖光山色的最佳方式。").avgStayMin(50).crowdedness(2).openingHours("08:00-17:00").ticketPrice(new BigDecimal("55")).sortOrder(8).build(),
                Poi.builder().tenantId(wl).poiId("entrance_01").name("西湖景区北入口").category("入口").lat(new BigDecimal("30.2700000")).lng(new BigDecimal("120.1550000")).description("西湖景区北入口，靠近断桥和白堤。").avgStayMin(5).crowdedness(1).openingHours("全天开放").ticketPrice(BigDecimal.ZERO).sortOrder(99).build(),
                // 清名桥古运河
                Poi.builder().tenantId("qingmingqiao").poiId("qm_001").name("清名桥").category("历史文化").lat(new BigDecimal("31.5600000")).lng(new BigDecimal("120.3100000")).description("清名桥始建于明万历年间，无锡现存最大单孔石拱桥。").avgStayMin(20).crowdedness(3).openingHours("全天开放").sortOrder(1).build(),
                Poi.builder().tenantId("qingmingqiao").poiId("qm_002").name("南长街").category("风景名胜与休闲度假").lat(new BigDecimal("31.5650000")).lng(new BigDecimal("120.3120000")).description("千年古街，被誉为'无锡老城活化石'。").avgStayMin(60).crowdedness(2).openingHours("全天开放").sortOrder(2).build(),
                Poi.builder().tenantId("qingmingqiao").poiId("qm_003").name("古运河水弄堂").category("风景名胜与休闲度假").lat(new BigDecimal("31.5620000")).lng(new BigDecimal("120.3110000")).description("'运河绝版地，江南水弄堂'。").avgStayMin(40).crowdedness(3).openingHours("全天开放").sortOrder(3).build(),
                // 豫园
                Poi.builder().tenantId("yuyuan").poiId("yy_001").name("玉玲珑").category("历史文化").lat(new BigDecimal("31.2280000")).lng(new BigDecimal("121.4890000")).description("江南三大名石之首，北宋花石纲遗物。").avgStayMin(15).crowdedness(3).openingHours("09:00-16:30").ticketPrice(new BigDecimal("40")).sortOrder(1).build(),
                Poi.builder().tenantId("yuyuan").poiId("yy_002").name("大假山").category("历史文化").lat(new BigDecimal("31.2290000")).lng(new BigDecimal("121.4880000")).description("江南现存最古老黄石假山。").avgStayMin(20).crowdedness(2).openingHours("09:00-16:30").ticketPrice(new BigDecimal("40")).sortOrder(2).build(),
                // 朱家角古镇
                Poi.builder().tenantId("zhujiajiao").poiId("zj_001").name("放生桥").category("古镇水乡").lat(new BigDecimal("31.1100000")).lng(new BigDecimal("121.0500000")).description("华东最大五孔石拱桥，建于明万历年间。").avgStayMin(15).crowdedness(3).openingHours("全天开放").sortOrder(1).build(),
                Poi.builder().tenantId("zhujiajiao").poiId("zj_002").name("课植园").category("古镇水乡").lat(new BigDecimal("31.1090000")).lng(new BigDecimal("121.0490000")).description("上海最大的庄园式私家园林。").avgStayMin(40).crowdedness(2).openingHours("08:30-16:30").ticketPrice(new BigDecimal("20")).sortOrder(2).build(),
                Poi.builder().tenantId("zhujiajiao").poiId("zj_003").name("北大街").category("古镇水乡").lat(new BigDecimal("31.1110000")).lng(new BigDecimal("121.0510000")).description("上海保存最完整的明清商业街。").avgStayMin(30).crowdedness(3).openingHours("全天开放").sortOrder(3).build()
        );
        poiRepository.saveAll(pois);

        // ─── 实时资讯 ────────────────────────────────────
        List<RealtimeInfo> infos = Arrays.asList(
                RealtimeInfo.builder().tenantId(wl).weather("晴").temperature(new BigDecimal("28")).crowdednessLevel(3)
                        .announcements(JsonUtils.toJson(Arrays.asList("今日索道检修请步行上山", "下午3点后雷峰塔人流下降", "推荐前往孤山人流较少"))).updateTime(LocalDateTime.now()).build(),
                RealtimeInfo.builder().tenantId("qingmingqiao").weather("多云").temperature(new BigDecimal("26")).crowdednessLevel(2)
                        .announcements(JsonUtils.toJson(Arrays.asList("夜游运河灯光秀每晚19:00开始", "南长街美食节进行中"))).updateTime(LocalDateTime.now()).build(),
                RealtimeInfo.builder().tenantId("yuyuan").weather("晴").temperature(new BigDecimal("27")).crowdednessLevel(3)
                        .announcements(JsonUtils.toJson(Arrays.asList("豫园灯会每晚18:00亮灯", "周末游客较多建议错峰"))).updateTime(LocalDateTime.now()).build(),
                RealtimeInfo.builder().tenantId("zhujiajiao").weather("多云").temperature(new BigDecimal("25")).crowdednessLevel(2)
                        .announcements(JsonUtils.toJson(Arrays.asList("摇橹船运营至17:00", "阿婆茶楼有评弹表演"))).updateTime(LocalDateTime.now()).build()
        );
        realtimeInfoRepository.saveAll(infos);

        // ─── 离线知识库 FAQ ──────────────────────────────
        List<OfflineKnowledge> faqs = Arrays.asList(
                OfflineKnowledge.builder().tenantId(wl).question("厕所在哪里").answer("前方50米右转有景区卫生间指示牌").build(),
                OfflineKnowledge.builder().tenantId(wl).question("门票多少钱").answer("西湖免费开放，雷峰塔全价80元学生半价").build(),
                OfflineKnowledge.builder().tenantId(wl).question("开放时间").answer("西湖全天开放，收费景点8:00-17:00").build(),
                OfflineKnowledge.builder().tenantId(wl).question("怎么去").answer("地铁1号线龙翔桥站或公交到断桥站").build(),
                OfflineKnowledge.builder().tenantId(wl).question("附近有什么好吃的").answer("推荐西湖醋鱼、龙井虾仁、叫花鸡、东坡肉").build(),
                OfflineKnowledge.builder().tenantId(wl).question("可以带宠物吗").answer("景区内禁止携带宠物，导盲犬除外").build(),
                OfflineKnowledge.builder().tenantId("ningbo_fangte").question("营业时间").answer("9:00-17:30节假日延长至21:00").build(),
                OfflineKnowledge.builder().tenantId("ningbo_fangte").question("门票多少钱").answer("标准票280元儿童/长者票180元夜场票120元").build(),
                OfflineKnowledge.builder().tenantId("yuyuan").question("开放时间").answer("9:00-16:30(16:00停止入园)").build(),
                OfflineKnowledge.builder().tenantId("yuyuan").question("门票价格").answer("旺季40元淡季30元").build(),
                OfflineKnowledge.builder().tenantId("zhujiajiao").question("怎么去").answer("地铁17号线至朱家角站").build()
        );
        offlineKnowledgeRepository.saveAll(faqs);

        log.info("✅ 演示数据初始化完成: {}个租户, {}个POI, {}条FAQ, {}条实时资讯",
                tenants.size(), pois.size(), faqs.size(), infos.size());
    }
}
