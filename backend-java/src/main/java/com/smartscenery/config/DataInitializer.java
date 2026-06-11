package com.smartscenery.config;

import com.smartscenery.entity.OfflineKnowledge;
import com.smartscenery.entity.Poi;
import com.smartscenery.entity.RealtimeInfo;
import com.smartscenery.repository.OfflineKnowledgeRepository;
import com.smartscenery.repository.PoiRepository;
import com.smartscenery.repository.RealtimeInfoRepository;
import com.smartscenery.util.JsonUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

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

    @Override
    public void run(String... args) {
        if (poiRepository.count() > 0) {
            log.info("数据库已有数据，跳过初始化");
            return;
        }

        String tenantId = "west_lake";
        log.info("初始化演示数据: tenant_id={}", tenantId);

        // ─── POI 景点数据 ────────────────────────────────
        List<Poi> pois = Arrays.asList(
                Poi.builder().tenantId(tenantId).poiId("poi_001").name("断桥残雪")
                        .category("自然风光").lat(30.261).lng(120.150)
                        .description("断桥位于杭州西湖白堤的东端，背靠宝石山，面向杭州城。传说《白蛇传》中许仙与白娘子在此相遇。冬雪初晴，桥阳面冰消雪化，桥阴面依旧白雪皑皑，远望桥身似断非断，'断桥残雪'因此得名。")
                        .avgStayMin(20).crowdedness(3).openingHours("全天开放").sortOrder(1).build(),
                Poi.builder().tenantId(tenantId).poiId("poi_002").name("苏堤春晓")
                        .category("自然风光").lat(30.256).lng(120.138)
                        .description("苏堤是北宋大诗人苏轼任杭州知州时，疏浚西湖，利用挖出的淤泥构筑而成。苏堤全长约3公里，堤上建有六桥，由北向南依次为跨虹、东浦、压堤、望山、锁澜、映波，被誉为'西湖十景'之首。")
                        .avgStayMin(40).crowdedness(2).openingHours("全天开放").sortOrder(2).build(),
                Poi.builder().tenantId(tenantId).poiId("poi_003").name("雷峰塔")
                        .category("历史文化").lat(30.232).lng(120.146)
                        .description("雷峰塔始建于北宋太平兴国二年（977年），是吴越国王钱俶为供奉佛螺髻发舍利而建。因《白蛇传》传说中白娘子被法海镇压于此而闻名。旧塔于1924年倒塌，现塔为2002年重建，塔高71.7米。")
                        .avgStayMin(45).crowdedness(4).openingHours("08:00-20:00").imageUrl("https://example.com/leifeng.jpg").sortOrder(3).build(),
                Poi.builder().tenantId(tenantId).poiId("poi_004").name("曲院风荷")
                        .category("自然风光").lat(30.253).lng(120.127)
                        .description("曲院风荷位于西湖西侧，以夏日荷花盛景闻名。南宋时此处设有酿制官酒的曲院，院中种植荷花，每逢夏日，荷香与酒香四溢，令人陶醉。公园占地约28公顷，是西湖最大的赏荷胜地。")
                        .avgStayMin(30).crowdedness(2).openingHours("全天开放").sortOrder(4).build(),
                Poi.builder().tenantId(tenantId).poiId("poi_005").name("三潭印月")
                        .category("自然风光").lat(30.245).lng(120.143)
                        .description("三潭印月是西湖中最大的岛屿，面积约7公顷。岛上建有三座石塔，塔高约2米，塔身中空，球面体上排列着5个小圆孔。每逢月夜，在塔中点燃灯烛，灯光从小孔中透出，与月光倒映水中，景色奇丽。")
                        .avgStayMin(35).crowdedness(3).openingHours("08:00-17:00").sortOrder(5).build(),
                Poi.builder().tenantId(tenantId).poiId("poi_006").name("花港观鱼")
                        .category("休闲娱乐").lat(30.240).lng(120.133)
                        .description("花港观鱼位于西湖西南角，全园分为红鱼池、牡丹园、花港、大草坪、密林地五个景区。红鱼池中放养着数万尾金鳞红鲤，游客可凭栏投饵，观赏鱼群争食的生动景象。")
                        .avgStayMin(25).crowdedness(2).openingHours("全天开放").sortOrder(6).build(),
                Poi.builder().tenantId(tenantId).poiId("poi_007").name("灵隐寺")
                        .category("历史文化").lat(30.244).lng(120.101)
                        .description("灵隐寺始建于东晋咸和元年（326年），是杭州最早的名刹，也是中国佛教禅宗十大古刹之一。寺内有大雄宝殿、天王殿等建筑，珍藏有大量佛教文物。飞来峰石刻造像是中国南方石窟艺术的重要代表。")
                        .avgStayMin(60).crowdedness(3).openingHours("07:00-18:00").sortOrder(7).build(),
                Poi.builder().tenantId(tenantId).poiId("poi_008").name("西湖游船")
                        .category("休闲娱乐").lat(30.258).lng(120.142)
                        .description("西湖游船是体验西湖美景的最佳方式之一。游船分为画舫、手划船、自划船等类型，可容纳不同人数的游客。乘船游览西湖，可欣赏湖光山色，感受'欲把西湖比西子，淡妆浓抹总相宜'的诗意。")
                        .avgStayMin(50).crowdedness(2).openingHours("08:00-17:00").sortOrder(8).build(),
                Poi.builder().tenantId(tenantId).poiId("entrance_01").name("西湖景区北入口")
                        .category("入口").lat(30.270).lng(120.155)
                        .description("西湖景区北入口，靠近断桥和白堤，是游客进入西湖景区的主要入口之一。")
                        .avgStayMin(5).crowdedness(1).openingHours("全天开放").sortOrder(99).build()
        );
        poiRepository.saveAll(pois);

        // ─── 实时资讯 ────────────────────────────────────
        RealtimeInfo info = RealtimeInfo.builder()
                .tenantId(tenantId)
                .weather("晴")
                .temperature(28)
                .crowdednessLevel(3)
                .peakPois(JsonUtils.toJson(Arrays.asList("poi_003", "poi_001")))
                .announcements(JsonUtils.toJson(Arrays.asList(
                        "今日索道检修，请步行上山",
                        "下午3点后雷峰塔人流下降",
                        "推荐前往孤山，人流较少"
                )))
                .updateTime(LocalDateTime.now())
                .build();
        realtimeInfoRepository.save(info);

        // ─── 离线知识库 FAQ ──────────────────────────────
        List<OfflineKnowledge> faqs = Arrays.asList(
                OfflineKnowledge.builder().tenantId(tenantId)
                        .question("厕所在哪里").answer("前方50米右转，有景区卫生间指示牌").build(),
                OfflineKnowledge.builder().tenantId(tenantId)
                        .question("门票多少钱").answer("西湖景区免费开放，部分景点如雷峰塔需单独购票，全价80元，学生半价").build(),
                OfflineKnowledge.builder().tenantId(tenantId)
                        .question("开放时间").answer("西湖景区全天开放，部分收费景点开放时间为8:00-17:00/20:00不等").build(),
                OfflineKnowledge.builder().tenantId(tenantId)
                        .question("怎么去").answer("可乘坐地铁1号线到龙翔桥站，或公交到断桥站/少年宫站").build(),
                OfflineKnowledge.builder().tenantId(tenantId)
                        .question("附近有什么好吃的").answer("推荐西湖醋鱼、龙井虾仁、叫花鸡、东坡肉等杭州名菜").build(),
                OfflineKnowledge.builder().tenantId(tenantId)
                        .question("可以带宠物吗").answer("景区内禁止携带宠物，导盲犬除外").build()
        );
        offlineKnowledgeRepository.saveAll(faqs);

        log.info("✅ 演示数据初始化完成: {}个POI, {}条FAQ", pois.size(), faqs.size());
    }
}
