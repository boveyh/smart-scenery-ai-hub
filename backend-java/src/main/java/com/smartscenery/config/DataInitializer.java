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
    @Autowired
    private DigitalHumanConfigRepository digitalHumanConfigRepository;
    @Autowired
    private KnowledgeChunkRepository knowledgeChunkRepository;

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

        // ─── 灵山胜境知识库（47条） ────────────────────
        List<KnowledgeChunk> knowledgeChunks = Arrays.asList(
                // 景区概况
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_overview_001").title("灵山胜境概况").content("灵山胜境坐落于江苏省无锡市太湖西北部的马山镇，地处秦履峰、青龙山、白虎山三山环抱之间，占地面积约30万平方米，是国家5A级旅游景区、世界佛教论坛永久会址，被誉为东方佛国和太湖佛国。").source("lingshan_guide").chunkOrder(1).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_overview_002").title("玄奘与小灵山渊源").content("唐贞观年间，玄奘法师西行取经归来途经马山，见此地层峦丛翠、曲水净秀、山形酷似印度灵鹫山，遂命名为小灵山，并嘱咐大弟子窥基法师在此住持道场，奠定了此地的佛教根基。").source("lingshan_guide").chunkOrder(2).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_overview_003").title("祥符禅寺千年历史").content("祥符禅寺始建于唐贞观年间，由玄奘法师弟子窥基大师开坛讲经，北宋年间正式更名为祥符禅寺，千年间历经多次兴废，是江南重要的千年禅宗祖庭。").source("lingshan_guide").chunkOrder(3).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_overview_004").title("景区建设历程").content("灵山胜境于1994年奠基，1997年灵山大佛落成开光，2003年九龙灌浴建成，2006-2009年灵山梵宫、五印坛城、曼飞龙塔等三期主体工程完工。").source("lingshan_guide").chunkOrder(4).build(),
                // 景点LS-001
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_001_001").title("灵山大照壁").content("灵山大照壁位于景区入口处，面朝太湖，长39.8米高7米，采用优质青石雕刻，被誉为华夏第一壁。赵朴初先生题写鎏金灵山胜境四字，北面刻有诗作《小灵山》。全天开放免费观赏。").tags("LS-001").source("lingshan_dataset").chunkOrder(5).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_001_002").title("灵山大照壁游玩").content("灵山大照壁是进入灵山胜境的第一道景观，适合打卡合影拍摄湖光壁影同框美景，全天开放免费观赏。").tags("LS-001").source("lingshan_dataset").chunkOrder(6).build(),
                // 景点LS-002
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_002_001").title("五明桥").content("五明桥位于大照壁北侧横跨香水海，5座汉白玉石拱桥并列。代表声明因明内明医方明工巧明五种佛教智慧，寓意过桥开启智慧走向觉悟。全天开放免费通行。").tags("LS-002").source("lingshan_dataset").chunkOrder(7).build(),
                // 景点LS-003
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_003_001").title("佛足坛").content("佛足坛位于五明桥北侧菩提大道起点，巨型佛足印一对每只长1.2米宽0.6米青铜铸造。复刻佛祖真身脚印，足心刻有千辐轮相等32种吉祥图案。全天开放可触摸祈福。").tags("LS-003").source("lingshan_dataset").chunkOrder(8).build(),
                // 景点LS-004
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_004_001").title("五智门").content("五智门高16.8米宽35米五门六柱汉白玉牌坊，五门象征五方五佛，六柱代表六度波罗蜜。穿过此门从凡俗踏入禅意圣地，与灵山大佛在同一中轴线上。全天开放。").tags("LS-004").source("lingshan_dataset").chunkOrder(9).build(),
                // 景点LS-005
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_005_001").title("菩提大道").content("菩提大道长约250米宽约10米，两侧近百棵印度菩提树形成天然拱廊。象征佛陀悟道成佛历程，四季景色各异。直通九龙灌浴广场，是最具禅意的步道。全天开放。").tags("LS-005").source("lingshan_dataset").chunkOrder(10).build(),
                // 景点LS-006
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_006_001").title("九龙灌浴").content("九龙灌浴总高27.2米鎏金太子佛高7.2米重12吨，耗铜180吨。依据《本行经》中佛陀诞生传说打造，再现花开见佛九龙沐浴祥瑞景象。表演时莲花绽放太子佛升起九条飞龙喷水。").tags("LS-006").source("lingshan_dataset").chunkOrder(11).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_006_002").title("九龙灌浴表演时间").content("九龙灌浴平日演出时间：10:00、11:30、13:30、15:00，每场15分钟。周末节假日增加场次。表演后可接取龙头圣水寓意祈福安康。建议提前10分钟到场。").tags("LS-006").source("lingshan_dataset").chunkOrder(12).build(),
                // 景点LS-007
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_007_001").title("降魔浮雕").content("降魔浮雕长26米高4.6米整块花岗岩雕刻。再现佛陀战胜魔王波旬诱惑威胁觉悟成佛的历程。高浮雕浅浮雕结合，中央佛陀端坐两侧魔女魔兵形成鲜明对比。全天开放。").tags("LS-007").source("lingshan_dataset").chunkOrder(13).build(),
                // 景点LS-008
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_008_001").title("阿育王柱").content("阿育王柱通高16.9米直径1.8米总重180吨整块花岗岩雕成。柱头四狮朝向四方象征佛法传播。与灵山大佛五智门构成中轴线核心景观序列。全天开放。").tags("LS-008").source("lingshan_dataset").chunkOrder(14).build(),
                // 景点LS-009
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_009_001").title("百子戏弥勒").content("百子戏弥勒高3米宽7.8米重9吨青铜群雕。弥勒佛卧姿袒胸露腹，百名孩童形态各异。寓意多子多福家庭和睦。可触摸佛肚祈福，亲子互动热门点位。全天开放。").tags("LS-009").source("lingshan_dataset").chunkOrder(15).build(),
                // 景点LS-010
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_010_001").title("祥符禅寺历史").content("祥符禅寺为唐代古刹占地约30亩，仿唐重檐歇山式建筑。含弥勒殿大雄宝殿钟楼鼓楼。六角井被茶圣陆羽品鉴为江南名泉，千年古银杏秋季金黄。钟楼悬挂12.8吨祥符禅钟。").tags("LS-010").source("lingshan_dataset").chunkOrder(16).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_010_002").title("祥符禅寺游玩").content("祥符禅寺全天开放。可礼佛祈福聆听祥符禅钟感受禅意悠远，观赏唐代古建与千年历史遗迹。秋季欣赏千年银杏金黄景致。寺内禁止大声喧哗需保持庄严肃穆。").tags("LS-010").source("lingshan_dataset").chunkOrder(17).build(),
                // 景点LS-011
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_011_001").title("灵山大佛数据").content("灵山大佛通高88米（佛体79米莲花瓣9米），总高101.5米，用铜725吨，1560块铜壁板。右手施无畏印左手施与愿印。216级登云道前段108级烦恼尽除后段108级愿望圆满。").tags("LS-011").source("lingshan_dataset").chunkOrder(18).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_011_002").title("灵山大佛游玩").content("灵山大佛开放时间8:00-17:00冬季至16:30。登顶可抱佛脚俯瞰太湖全景。夕阳时金色阳光洒在佛身上佛光普照。是世界最高露天青铜释迦牟尼立像。").tags("LS-011").source("lingshan_dataset").chunkOrder(19).build(),
                // 景点LS-012
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_012_001").title("佛教文化博览馆").content("佛教文化博览馆位于大佛三层座基内10000㎡。一层五方五佛四大名山，二层世界佛教发展史，三层万佛殿9999尊小佛。免费参观8:00-17:00开放。免费讲解9:30/11:00/14:30/16:00。").tags("LS-012").source("lingshan_dataset").chunkOrder(20).build(),
                // 景点LS-013
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_013_001").title("灵山梵宫概述").content("灵山梵宫建筑面积72000㎡造价18亿，被誉为东方卢浮宫。五座莲花圣塔象征五方五佛。汇集东阳木雕琉璃油画景泰蓝玉雕漆画等传统工艺。获鲁班奖。9:00-17:00开放。").tags("LS-013").source("lingshan_dataset").chunkOrder(21).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_013_002").title("灵山梵宫艺术").content("梵宫核心艺术品：28米高星空穹顶100公斤纯金绘制148尊飞天；华藏世界琉璃壁画8米宽10米高160块琉璃熔铸；东阳木雕群金丝楠木。圣坛全球唯一旋转舞台全息投影水雾技术。").tags("LS-013").source("lingshan_dataset").chunkOrder(22).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_013_003").title("吉祥颂演出").content("《灵山吉祥颂》演出每日10:35/11:30/14:00/16:00，时长20分钟。凭景区大门票免费入场，建议提前30分钟排队。梵宫内禁止闪光灯拍照。第二四届世界佛教论坛会址。").tags("LS-013").source("lingshan_dataset").chunkOrder(23).build(),
                // 景点LS-014
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_014_001").title("五印坛城").content("五印坛城位于香水海中央圆岛，五层重檐楼宇高30米占地5000㎡，藏式碉楼风格有布达拉宫之称。白墙红边金顶，四门瑞兽铜雕。壁画1500㎡纯手工绘制。转经筒长廊108个铜筒。").tags("LS-014").source("lingshan_dataset").chunkOrder(24).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_014_002").title("五印坛城游玩").content("五印坛城9:00-17:00开放。顺时针转动转经筒祈福。登五层观景台俯瞰香水海梵宫大佛全景。藏香制作体验需预约10:00/14:00。与梵宫曼飞龙塔构成佛教三大语系建筑群。").tags("LS-014").source("lingshan_dataset").chunkOrder(25).build(),
                // 景点LS-015
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_015_001").title("曼飞龙塔").content("曼飞龙塔主塔高16.9米，一主八小九塔组合，白色花岗岩鎏金塔刹。南传佛教干栏式傣族建筑风格。复刻云南西双版纳曼飞龙白塔。全天开放夜间有灯光亮化。").tags("LS-015").source("lingshan_dataset").chunkOrder(26).build(),
                // 景点LS-016
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_016_001").title("无尽意斋").content("无尽意斋占地600㎡四合院风格，复刻赵朴初北京故居。正房设生平事迹厅灵山渊源厅书法作品厅。禅意茶室免费提供灵山禅茶。9:00-17:00开放免费参观。禁止闪光灯拍照。").tags("LS-016").source("lingshan_dataset").chunkOrder(27).build(),
                // 游览路线
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_route_001").title("历史文化爱好者路线").content("历史文化爱好者推荐6小时深度游：南门入园→灵山大照壁→胜境广场→佛手广场→祥符禅寺→杏坛广场→佛前广场→灵山大佛→灵山梵宫→五印坛城→三圣殿→出口。").source("lingshan_guide").chunkOrder(28).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_route_002").title("自然风光爱好者路线").content("自然风光爱好者推荐5小时全景游：南门入园→佛足坛→九龙灌浴→菩提大道→灵山大佛登顶→曼飞龙塔→灵山精舍→梵宫广场→出口。").source("lingshan_guide").chunkOrder(29).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_route_003").title("亲子家庭路线").content("亲子家庭推荐4小时轻松游：南门入园→九龙灌浴→佛手广场→百子戏弥勒→梵宫→五印坛城→出口。").source("lingshan_guide").chunkOrder(30).build(),
                // 门票信息
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_ticket_001").title("门票价格").content("灵山胜境成人票210元，半价票105元（6-18岁/学生/60-69岁老人）。6岁以下或1.4米以下儿童70岁以上老人现役军人残疾人免票。网购联票225元含观光车无限次。观光车单独40元/人。").source("lingshan_guide").chunkOrder(31).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_ticket_002").title("最佳游览时间").content("最佳游览季节春秋季3-5月和9-11月。建议上午9点前入园避开人流高峰。九龙灌浴每日4-5场表演。吉祥颂演出每日10:35/11:30/14:00/16:00。").source("lingshan_guide").chunkOrder(32).build(),
                // 餐饮住宿
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_food_001").title("餐饮住宿").content("景区餐饮：梵宫素斋自助50元/位，素面套餐35元/位。住宿推荐：灵山精舍（禅意酒店含素斋早课）或马山镇周边酒店民宿。").source("lingshan_guide").chunkOrder(33).build(),
                KnowledgeChunk.builder().tenantId("ling_shan").chunkId("ls_tips_001").title("游览建议").content("游览建议穿着舒适运动鞋，携带相机充电宝防晒霜雨伞。景区提供导游讲解服务300元起。保持安静尊重宗教信仰不触摸佛像。部分区域禁止拍照。").source("lingshan_guide").chunkOrder(34).build()
        );
        knowledgeChunkRepository.saveAll(knowledgeChunks);
        log.info("已初始化 {} 条灵山胜境知识条目", knowledgeChunks.size());

        // 数字人配置（每个模型对应一个数字人角色）
        List<DigitalHumanConfig> dhConfigs = Arrays.asList(
                DigitalHumanConfig.builder().tenantId("default_haru").personaName("Haru").ttsVoice("zh-CN-XiaoxiaoNeural").ttsRate("+10%").ttsPitch("+0Hz")
                        .personaPrompt("你叫 Haru，是一位阳光开朗、活力满满的少女导游。你性格活泼外向，喜欢和人聊天，总是带着灿烂的笑容。用轻松愉快的语气介绍景点，偶尔开个小玩笑，让游客感到亲切和放松。你擅长用生动的比喻和有趣的小故事来讲解历史文化。").live2dModel("haru").build(),
                DigitalHumanConfig.builder().tenantId("default_hiyori").personaName("Hiyori").ttsVoice("zh-CN-XiaoxiaoNeural").ttsRate("+0%").ttsPitch("+0Hz")
                        .personaPrompt("你叫 Hiyori，是一位温柔优雅、知书达理的古典少女导游。你说话轻声细语，举止端庄，像一位从古代画卷中走出的才女。用富有诗意的语言介绍景点，擅长引用古诗词和历史典故，让游客感受文化的韵味。").live2dModel("hiyori").build(),
                DigitalHumanConfig.builder().tenantId("default_871").personaName("871").ttsVoice("zh-CN-YunxiNeural").ttsRate("+0%").ttsPitch("+0Hz")
                        .personaPrompt("你叫 871，是一位冷静沉着、思维理性的科技型导游。你说话简洁有力，逻辑清晰，喜欢用数据和事实说话。擅长讲解景点的建筑结构、历史数据和科学原理，回答问题时条理分明、言简意赅。").live2dModel("871").build(),
                DigitalHumanConfig.builder().tenantId("default_z").personaName("Z").ttsVoice("zh-CN-YunjianNeural").ttsRate("+5%").ttsPitch("+0Hz")
                        .personaPrompt("你叫 Z，是一位神秘莫测、充满智慧的向导。你说话带着一丝神秘感，喜欢用哲理性的语言来解读景点背后的故事。你像是穿越时空的旅人，知道很多不为人知的秘密和历史细节，偶尔会给出令人深思的感悟。").live2dModel("z").build(),
                DigitalHumanConfig.builder().tenantId("default_ruanmei").personaName("阮梅").ttsVoice("zh-CN-XiaoyiNeural").ttsRate("+0%").ttsPitch("+0Hz")
                        .personaPrompt("你叫阮梅，是一位温婉如水、才情横溢的江南女子导游。你说话带有江南水乡的柔美韵味，像一位精通琴棋书画的才女。用细腻的情感描绘风景，擅长讲解园林艺术、传统工艺和文人雅事，让游客领略江南文化的精髓。").live2dModel("ruanmei").build(),
                DigitalHumanConfig.builder().tenantId("default_betasmodel").personaName("BetaSmodel").ttsVoice("zh-CN-XiaomengNeural").ttsRate("+15%").ttsPitch("+5Hz")
                        .personaPrompt("你叫 BetaSmodel，是一位充满活力、元气满满的虚拟主播风格导游。你说话节奏快、语气活泼，像直播一样和游客互动。喜欢用网络流行语和有趣的表情包语言，擅长调动气氛，让游览过程像一场欢乐的直播秀。").live2dModel("betasmodel").build(),
                DigitalHumanConfig.builder().tenantId("default_kirinkirinja").personaName("Kirin Kirinja").ttsVoice("zh-CN-XiaoshuangNeural").ttsRate("+0%").ttsPitch("+0Hz")
                        .personaPrompt("你叫 Kirin Kirinja，是一位来自异世界的奇幻导游，有着麒麟般的神秘气质。你说话充满想象力和童话色彩，喜欢把景点比作奇幻世界中的场景。用讲故事的方式带领游客穿越现实与幻想的边界，让每一次游览都成为一场冒险。").live2dModel("kirinkirinja").build(),
                DigitalHumanConfig.builder().tenantId("default_osagegirl").personaName("Osage Girl").ttsVoice("zh-CN-XiaoxiaoNeural").ttsRate("+5%").ttsPitch("+0Hz")
                        .personaPrompt("你叫 Osage Girl，是一位端庄典雅、温柔大方的和风少女导游。你说话带着日式的礼貌和温柔，像一位身着和服的大家闺秀。用细致入微的观察和充满禅意的语言介绍景点，擅长讲解园林美学、茶道文化和传统礼仪。").live2dModel("osagegirl").build(),
                DigitalHumanConfig.builder().tenantId("default_halfdemonelf").personaName("Half-Demon Elf").ttsVoice("zh-CN-YunyangNeural").ttsRate("+0%").ttsPitch("+0Hz")
                        .personaPrompt("你叫 Half-Demon Elf，是一位半魔半精灵的神秘向导，拥有超凡的感知力。你说话带着空灵和神秘的气质，能看到常人忽视的细节和能量。用充满灵性的语言描绘自然景观，擅长讲解山水之间的灵气和传说，带给游客超越凡俗的体验。").live2dModel("halfdemonelf").build()
        );
        digitalHumanConfigRepository.saveAll(dhConfigs);

        log.info("✅ 演示数据初始化完成: {}个租户, {}个POI, {}条FAQ, {}条实时资讯, {}个数字人配置",
                tenants.size(), pois.size(), faqs.size(), infos.size(), dhConfigs.size());
    }
}
