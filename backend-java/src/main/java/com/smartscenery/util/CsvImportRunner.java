package com.smartscenery.util;

import java.io.BufferedReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.smartscenery.entity.KnowledgeChunk;
import com.smartscenery.entity.OfflineKnowledge;
import com.smartscenery.entity.Poi;
import com.smartscenery.entity.PoiCrowdedness;
import com.smartscenery.entity.Tenant;
import com.smartscenery.entity.TouristBehavior;
import com.smartscenery.repository.KnowledgeChunkRepository;
import com.smartscenery.repository.OfflineKnowledgeRepository;
import com.smartscenery.repository.PoiCrowdednessRepository;
import com.smartscenery.repository.PoiRepository;
import com.smartscenery.repository.TenantRepository;
import com.smartscenery.repository.TouristBehaviorRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * CSV 批量数据导入工具 — 支持通过命令行运行
 *
 * 用法：
 *   方式1：应用启动时自动扫描（已有数据则跳过）
 *   方式2：在项目根目录手动运行 java -cp ... com.smartscenery.util.CsvImportRunner
 *
 * 支持导入的表：
 *   - tourist_behavior  游客行为数据
 *   - poi               景点POI数据
 *   - tenant            租户/景区数据
 *   - knowledge_chunk   知识库分片数据
 *   - offline_knowledge 离线FAQ数据
 *   - poi_crowdedness   景点拥挤度数据
 *
 * CSV 文件命名约定（放在项目根目录）：
 *   - tourist_behavior.csv  游客行为
 *   - poi.csv               景点POI
 *   - tenant.csv            租户
 *   - knowledge_chunk.csv   知识分片
 *   - offline_knowledge.csv 离线FAQ
 *   - poi_crowdedness.csv   拥挤度
 */
@Slf4j
@Component
public class CsvImportRunner implements CommandLineRunner {

    @Autowired
    private TouristBehaviorRepository touristBehaviorRepository;
    @Autowired
    private PoiRepository poiRepository;
    @Autowired
    private TenantRepository tenantRepository;
    @Autowired
    private KnowledgeChunkRepository knowledgeChunkRepository;
    @Autowired
    private OfflineKnowledgeRepository offlineKnowledgeRepository;
    @Autowired
    private PoiCrowdednessRepository poiCrowdednessRepository;

    /** 命令行参数: --csv-import=all 或 --csv-import=tourist_behavior,poi */
    private static final String CLI_ARG_PREFIX = "--csv-import=";

    /**
     * 景区名称 → tenantId 映射表（用于游客行为等数据自动关联）
     */
    private static final Map<String, String> ATTRACTION_TENANT_MAP = new LinkedHashMap<>();

    static {
        ATTRACTION_TENANT_MAP.put("西湖", "west_lake");
        ATTRACTION_TENANT_MAP.put("宁波方特", "ningbo_fangte");
        ATTRACTION_TENANT_MAP.put("中国航海博物馆", "china_navigation_museum");
        ATTRACTION_TENANT_MAP.put("苏州乐园", "suzhou_forest");
        ATTRACTION_TENANT_MAP.put("顾村公园", "gucun_park");
        ATTRACTION_TENANT_MAP.put("清名桥", "qingmingqiao");
        ATTRACTION_TENANT_MAP.put("古运河", "qingmingqiao");
        ATTRACTION_TENANT_MAP.put("豫园", "yuyuan");
        ATTRACTION_TENANT_MAP.put("周庄", "zhouzhuang");
        ATTRACTION_TENANT_MAP.put("朱家角", "zhujiajiao");
        ATTRACTION_TENANT_MAP.put("灵山", "ling_shan");
    }

    /**
     * 景点名称 → poiId 映射表（根据实际 POI 数据动态构建）
     */
    private Map<String, String> nameToPoiIdMap = new HashMap<>();

    @Override
    public void run(String... args) {
        // 检查是否通过命令行参数触发了导入
        String importArg = null;
        for (String arg : args) {
            if (arg.startsWith(CLI_ARG_PREFIX)) {
                importArg = arg.substring(CLI_ARG_PREFIX.length());
                break;
            }
        }

        if (importArg == null) {
            // 没有命令行参数，使用默认的自动检测模式（仅导入 tourist_behavior）
            log.info("未指定 --csv-import 参数，使用默认自动导入模式");
            importSingleTable("tourist_behavior", false);
            return;
        }

        log.info("收到 CSV 导入指令: {}", importArg);

        if ("all".equalsIgnoreCase(importArg)) {
            importAllTables();
        } else {
            String[] tables = importArg.split(",");
            for (String table : tables) {
                importSingleTable(table.trim(), true);
            }
        }
    }

    /**
     * 导入所有支持的表格
     */
    public void importAllTables() {
        log.info("========== 开始批量导入所有 CSV 数据 ==========");
        importSingleTable("tenant", true);
        importSingleTable("poi", true);
        importSingleTable("tourist_behavior", true);
        importSingleTable("knowledge_chunk", true);
        importSingleTable("offline_knowledge", true);
        importSingleTable("poi_crowdedness", true);
        log.info("========== 所有 CSV 数据导入完成 ==========");
    }

    /**
     * 导入单个表格
     */
    public void importSingleTable(String tableName, boolean force) {
        // 动态构建文件名
        List<String> possibleNames = getCsvFileNames(tableName);

        Path csvPath = null;

        for (String fileName : possibleNames) {
            csvPath = findCsvFile(fileName);
            if (csvPath != null) {
                break;
            }
        }

        if (csvPath == null) {
            log.warn("未找到 {} 对应的CSV文件 (查找: {})", tableName, String.join(", ", possibleNames));
            return;
        }

        log.info("开始导入 [{}] <- 文件: {} ({} bytes)", tableName, csvPath.toAbsolutePath(),
                csvPath.toFile().length());

        // 根据表名分发到不同的导入逻辑
        switch (tableName) {
            case "tourist_behavior":
                importTouristBehaviorStream(csvPath, force);
                break;
            case "poi":
                importPoiStream(csvPath, force);
                break;
            case "tenant":
                importTenantStream(csvPath, force);
                break;
            case "knowledge_chunk":
                importKnowledgeChunkStream(csvPath, force);
                break;
            case "offline_knowledge":
                importOfflineKnowledgeStream(csvPath, force);
                break;
            case "poi_crowdedness":
                importPoiCrowdednessStream(csvPath, force);
                break;
            default:
                log.warn("不支持的导入类型: {}", tableName);
        }
    }

    // ==================== 各表导入逻辑 ====================

    /**
     * 流式导入游客行为数据（支持大文件）
     * CSV期望列: tourist_id, user_nickname, age, gender, attraction_name,
     *            attraction_content(忽略), attraction_type(忽略),
     *            visit_date, stay_duration, ticket_cost, food_cost, shopping_cost,
     *            transport_cost, entertainment_cost, total_cost, group_size, satisfaction
     */
    private void importTouristBehaviorStream(Path csvPath, boolean force) {
        if (!force && touristBehaviorRepository.count() > 0) {
            log.info("游客行为数据表已有 {} 条数据，跳过导入", touristBehaviorRepository.count());
            return;
        }

        // 构建 POI 名称映射
        buildPoiNameMap();

        DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy/M/d");
        List<TouristBehavior> batch = new ArrayList<>();
        int success = 0, fail = 0, lineNum = 0;

        try (BufferedReader reader = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8)) {
            // 读取并解析表头
            String headerLine = reader.readLine();
            if (headerLine == null) {
                log.warn("[游客行为] CSV文件为空");
                return;
            }
            String[] headers = parseCsvLine(headerLine);
            log.info("[游客行为] 表头: {}", Arrays.toString(headers));
            lineNum++;

            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                lineNum++;
                if (line.isEmpty()) continue;

                try {
                    String[] fields = parseCsvLine(line);
                    TouristBehavior record = parseTouristBehavior(fields, dateFormatter);
                    if (record != null) {
                        batch.add(record);
                        success++;
                    } else {
                        fail++;
                    }
                } catch (Exception e) {
                    fail++;
                    if (fail <= 5) {
                        log.warn("第{}行解析失败: {}", lineNum, e.getMessage());
                    }
                }

                if (batch.size() >= 500) {
                    touristBehaviorRepository.saveAll(batch);
                    log.info("[游客行为] 已导入 {} 条 (当前行: {})...", success, lineNum);
                    batch.clear();
                }
            }

        } catch (IOException e) {
            log.error("[游客行为] CSV文件读取失败: {}", e.getMessage(), e);
        }

        if (!batch.isEmpty()) {
            touristBehaviorRepository.saveAll(batch);
        }
        log.info("✅ [游客行为] 导入完成: 成功{}条, 失败{}条, 总行数{}", success, fail, lineNum);
    }

    private TouristBehavior parseTouristBehavior(String[] fields, DateTimeFormatter dateFormatter) {
        // tourist_id,user_nickname,age,gender,attraction_name,attraction_content,
        // attraction_type,visit_date,stay_duration,ticket_cost,food_cost,shopping_cost,
        // transport_cost,entertainment_cost,total_cost,group_size,satisfaction
        if (fields.length < 17) {
            return null;
        }

        try {
            String touristId = fields[0].trim();
            String nickname = fields[1].trim();
            Integer age = parseInt(fields[2]);
            String gender = fields[3].trim();
            String attractionName = fields[4].trim();
            String attractionType = fields.length > 6 ? fields[6].trim() : "";
            LocalDate visitDate = LocalDate.parse(fields[7].trim(), dateFormatter);
            BigDecimal stayDuration = parseBigDecimal(fields[8]);
            BigDecimal ticketCost = parseBigDecimal(fields[9]);
            BigDecimal foodCost = parseBigDecimal(fields[10]);
            BigDecimal shoppingCost = parseBigDecimal(fields[11]);
            BigDecimal transportCost = parseBigDecimal(fields[12]);
            BigDecimal entertainmentCost = parseBigDecimal(fields[13]);
            BigDecimal totalCost = parseBigDecimal(fields[14]);
            Integer groupSize = parseInt(fields[15]);
            Integer satisfaction = parseInt(fields[16]);

            // 自动匹配 tenantId
            String tenantId = matchTenantId(attractionName);

            // 自动匹配 poiId
            String poiId = matchPoiId(attractionName);

            // 从停留时长推断 visitHour（取整）
            Integer visitHour = null;
            if (stayDuration != null) {
                visitHour = stayDuration.intValue() % 24;
            }

            return TouristBehavior.builder()
                    .touristId(touristId)
                    .userNickname(nickname)
                    .age(age)
                    .gender(gender)
                    .tenantId(tenantId)
                    .attractionName(attractionName)
                    .poiId(poiId)
                    .visitDate(visitDate)
                    .stayDuration(stayDuration)
                    .ticketCost(ticketCost)
                    .foodCost(foodCost)
                    .shoppingCost(shoppingCost)
                    .transportCost(transportCost)
                    .entertainmentCost(entertainmentCost)
                    .totalCost(totalCost)
                    .groupSize(groupSize)
                    .satisfaction(satisfaction)
                    .visitHour(visitHour)
                    .isPeakSeason(isPeakSeason(visitDate))
                    .build();
        } catch (Exception e) {
            log.warn("解析失败: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 流式导入景点 POI 数据
     * CSV期望列: tenant_id, poi_id, name, category, sub_category,
     *            lat, lng, address, description, detail_content,
     *            avg_stay_min, opening_hours, ticket_price, image_url, crowdedness
     */
    private void importPoiStream(Path csvPath, boolean force) {
        if (!force && poiRepository.count() > 0) {
            log.info("POI数据表已有 {} 条数据，跳过导入", poiRepository.count());
            return;
        }

        List<Poi> batch = new ArrayList<>();
        int success = 0, fail = 0, lineNum = 0;

        try (BufferedReader reader = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8)) {
            String headerLine = reader.readLine();
            if (headerLine == null) { log.warn("[POI] CSV文件为空"); return; }
            String[] headers = parseCsvLine(headerLine);
            log.info("[POI] 表头: {}", Arrays.toString(headers));
            lineNum++;

            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                lineNum++;
                if (line.isEmpty()) continue;

                try {
                    String[] fields = parseCsvLine(line);
                    Poi poi = parsePoi(fields);
                    if (poi != null) { batch.add(poi); success++; }
                    else { fail++; }
                } catch (Exception e) {
                    fail++;
                    if (fail <= 3) log.warn("第{}行解析POI失败: {}", lineNum, e.getMessage());
                }

                if (batch.size() >= 200) {
                    poiRepository.saveAll(batch);
                    log.info("[POI] 已导入 {} 条...", success);
                    batch.clear();
                }
            }
        } catch (IOException e) {
            log.error("[POI] CSV文件读取失败: {}", e.getMessage(), e);
        }

        if (!batch.isEmpty()) poiRepository.saveAll(batch);
        log.info("✅ [POI] 导入完成: 成功{}条, 失败{}条", success, fail);
    }

    private Poi parsePoi(String[] fields) {
        // 期望列: tenant_id, poi_id, name, category, sub_category, lat, lng, ...
        if (fields.length < 7) return null;

        try {
            int idx = 0;
            String tenantId = getField(fields, idx++);
            String poiId = getField(fields, idx++);
            String name = getField(fields, idx++);
            String category = getField(fields, idx++);
            String subCategory = getField(fields, idx++);
            BigDecimal lat = parseBigDecimal(getField(fields, idx++));
            BigDecimal lng = parseBigDecimal(getField(fields, idx++));
            String address = getField(fields, idx++);
            String description = getField(fields, idx++);
            String detailContent = getField(fields, idx++);
            Integer avgStayMin = parseInt(getField(fields, idx++));
            String openingHours = getField(fields, idx++);
            BigDecimal ticketPrice = parseBigDecimal(getField(fields, idx++));
            String imageUrl = getField(fields, idx++);
            Integer crowdedness = parseInt(getField(fields, idx++));

            return Poi.builder()
                    .tenantId(tenantId)
                    .poiId(poiId)
                    .name(name)
                    .category(category)
                    .subCategory(subCategory)
                    .lat(lat)
                    .lng(lng)
                    .address(address)
                    .description(description)
                    .detailContent(detailContent)
                    .avgStayMin(avgStayMin)
                    .openingHours(openingHours)
                    .ticketPrice(ticketPrice)
                    .imageUrl(imageUrl)
                    .crowdedness(crowdedness != null && crowdedness > 0 ? crowdedness : 1)
                    .build();
        } catch (Exception e) {
            log.warn("解析POI行失败: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 流式导入租户数据
     * CSV期望列: tenant_id, name, description, province, city, status
     */
    private void importTenantStream(Path csvPath, boolean force) {
        if (!force && tenantRepository.count() > 0) {
            log.info("租户数据表已有 {} 条数据，跳过导入", tenantRepository.count());
            return;
        }

        List<Tenant> batch = new ArrayList<>();
        int success = 0, fail = 0, lineNum = 0;

        try (BufferedReader reader = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8)) {
            reader.readLine(); lineNum++; // 跳过表头
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim(); lineNum++;
                if (line.isEmpty()) continue;
                try {
                    String[] fields = parseCsvLine(line);
                    if (fields.length < 2) { fail++; continue; }
                    batch.add(Tenant.builder()
                            .tenantId(getField(fields, 0))
                            .name(getField(fields, 1))
                            .description(getField(fields, 2))
                            .province(getField(fields, 3))
                            .city(getField(fields, 4))
                            .status(parseInt(getField(fields, 5), 1))
                            .build());
                    success++;
                } catch (Exception e) { fail++; }
            }
        } catch (IOException e) {
            log.error("[租户] CSV文件读取失败: {}", e.getMessage(), e);
        }

        tenantRepository.saveAll(batch);
        log.info("✅ [租户] 导入完成: 成功{}条, 失败{}条", success, fail);
    }

    /**
     * 流式导入知识库分片数据
     * CSV期望列: tenant_id, chunk_id, poi_id, title, content, tags, source, chunk_order
     */
    private void importKnowledgeChunkStream(Path csvPath, boolean force) {
        if (!force && knowledgeChunkRepository.count() > 0) {
            log.info("知识库分片表已有 {} 条数据，跳过导入", knowledgeChunkRepository.count());
            return;
        }

        List<KnowledgeChunk> batch = new ArrayList<>();
        int success = 0, fail = 0, lineNum = 0;

        try (BufferedReader reader = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8)) {
            reader.readLine(); lineNum++;
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim(); lineNum++;
                if (line.isEmpty()) continue;
                try {
                    String[] fields = parseCsvLine(line);
                    if (fields.length < 5) { fail++; continue; }
                    batch.add(KnowledgeChunk.builder()
                            .tenantId(getField(fields, 0))
                            .chunkId(getField(fields, 1))
                            .poiId(getField(fields, 2))
                            .title(getField(fields, 3))
                            .content(getField(fields, 4))
                            .tags(getField(fields, 5))
                            .source(getField(fields, 6))
                            .chunkOrder(parseInt(getField(fields, 7), 0))
                            .build());
                    success++;
                } catch (Exception e) { fail++; }
                if (batch.size() >= 200) {
                    knowledgeChunkRepository.saveAll(batch);
                    log.info("[知识分片] 已导入 {} 条...", success);
                    batch.clear();
                }
            }
        } catch (IOException e) {
            log.error("[知识分片] CSV文件读取失败: {}", e.getMessage(), e);
        }

        if (!batch.isEmpty()) knowledgeChunkRepository.saveAll(batch);
        log.info("✅ [知识分片] 导入完成: 成功{}条, 失败{}条", success, fail);
    }

    /**
     * 流式导入离线FAQ数据
     * CSV期望列: tenant_id, question, answer, click_count
     */
    private void importOfflineKnowledgeStream(Path csvPath, boolean force) {
        if (!force && offlineKnowledgeRepository.count() > 0) {
            log.info("离线FAQ表已有 {} 条数据，跳过导入", offlineKnowledgeRepository.count());
            return;
        }

        List<OfflineKnowledge> batch = new ArrayList<>();
        int success = 0, fail = 0, lineNum = 0;

        try (BufferedReader reader = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8)) {
            reader.readLine(); lineNum++;
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim(); lineNum++;
                if (line.isEmpty()) continue;
                try {
                    String[] fields = parseCsvLine(line);
                    if (fields.length < 3) { fail++; continue; }
                    batch.add(OfflineKnowledge.builder()
                            .tenantId(getField(fields, 0))
                            .question(getField(fields, 1))
                            .answer(getField(fields, 2))
                            .clickCount(parseInt(getField(fields, 3), 0))
                            .build());
                    success++;
                } catch (Exception e) { fail++; }
            }
        } catch (IOException e) {
            log.error("[离线FAQ] CSV文件读取失败: {}", e.getMessage(), e);
        }

        offlineKnowledgeRepository.saveAll(batch);
        log.info("✅ [离线FAQ] 导入完成: 成功{}条, 失败{}条", success, fail);
    }

    /**
     * 流式导入景点拥挤度数据
     * CSV期望列: tenant_id, poi_id, crowdedness, crowd_source, record_time
     */
    private void importPoiCrowdednessStream(Path csvPath, boolean force) {
        if (!force && poiCrowdednessRepository.count() > 0) {
            log.info("拥挤度明细表已有 {} 条数据，跳过导入", poiCrowdednessRepository.count());
            return;
        }

        DateTimeFormatter dtFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        List<PoiCrowdedness> batch = new ArrayList<>();
        int success = 0, fail = 0, lineNum = 0;

        try (BufferedReader reader = Files.newBufferedReader(csvPath, StandardCharsets.UTF_8)) {
            reader.readLine(); lineNum++;
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim(); lineNum++;
                if (line.isEmpty()) continue;
                try {
                    String[] fields = parseCsvLine(line);
                    if (fields.length < 3) { fail++; continue; }
                    LocalDateTime recordTime = fields.length > 4 && !fields[4].trim().isEmpty()
                            ? LocalDateTime.parse(fields[4].trim(), dtFormatter)
                            : LocalDateTime.now();
                    batch.add(PoiCrowdedness.builder()
                            .tenantId(getField(fields, 0))
                            .poiId(getField(fields, 1))
                            .crowdedness(parseInt(getField(fields, 2), 1))
                            .crowdSource(getField(fields, 3, "manual"))
                            .recordTime(recordTime)
                            .build());
                    success++;
                } catch (Exception e) { fail++; }
                if (batch.size() >= 500) {
                    poiCrowdednessRepository.saveAll(batch);
                    log.info("[拥挤度] 已导入 {} 条...", success);
                    batch.clear();
                }
            }
        } catch (IOException e) {
            log.error("[拥挤度] CSV文件读取失败: {}", e.getMessage(), e);
        }

        if (!batch.isEmpty()) poiCrowdednessRepository.saveAll(batch);
        log.info("✅ [拥挤度] 导入完成: 成功{}条, 失败{}条", success, fail);
    }

    // ==================== 工具方法 ====================

    /**
     * 根据 CSV 文件名推断可能的完整文件名
     */
    private List<String> getCsvFileNames(String tableName) {
        List<String> names = new ArrayList<>();
        // 1. 标准命名
        names.add(tableName + ".csv");
        // 2. 带前缀
        names.add("import_" + tableName + ".csv");
        // 3. 中文命名
        switch (tableName) {
            case "tourist_behavior":
                names.add("景点景区旅游数据行为分析数据.csv");
                names.add("景点景区旅游数据行为分析数据 - 副本.csv");
                names.add("游客行为数据.csv");
                names.add("tourist_behavior_data.csv");
                break;
            case "poi":
                names.add("景点POI数据.csv");
                names.add("poi_data.csv");
                break;
            case "tenant":
                names.add("景区租户数据.csv");
                names.add("tenant_data.csv");
                break;
            case "knowledge_chunk":
                names.add("知识库分片数据.csv");
                names.add("knowledge_data.csv");
                break;
            case "offline_knowledge":
                names.add("离线FAQ数据.csv");
                names.add("faq_data.csv");
                break;
            case "poi_crowdedness":
                names.add("拥挤度数据.csv");
                names.add("crowdedness_data.csv");
                break;
        }
        return names;
    }

    /**
     * 在多个路径下查找 CSV 文件
     */
    private Path findCsvFile(String fileName) {
        String userDir = System.getProperty("user.dir");
        List<String> searchPaths = List.of(
                fileName,
                "../" + fileName,
                "./" + fileName,
                userDir + "/" + fileName,
                "D:/Projects_for_study/smart-scenery-ai-hub/" + fileName
        );

        for (String path : searchPaths) {
            Path p = Paths.get(path);
            if (Files.exists(p)) {
                return p;
            }
        }
        return null;
    }

    /**
     * 从景点名称推断 tenantId
     */
    private String matchTenantId(String attractionName) {
        if (attractionName == null || attractionName.isEmpty()) {
            return "unknown";
        }
        for (Map.Entry<String, String> entry : ATTRACTION_TENANT_MAP.entrySet()) {
            if (attractionName.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return "unknown";
    }

    /**
     * 从景点名称推断 poiId（需要先构建映射）
     */
    private String matchPoiId(String attractionName) {
        if (attractionName == null || attractionName.isEmpty() || nameToPoiIdMap.isEmpty()) {
            return null;
        }
        // 精确匹配
        if (nameToPoiIdMap.containsKey(attractionName)) {
            return nameToPoiIdMap.get(attractionName);
        }
        // 模糊匹配
        for (Map.Entry<String, String> entry : nameToPoiIdMap.entrySet()) {
            if (attractionName.contains(entry.getKey()) || entry.getKey().contains(attractionName)) {
                return entry.getValue();
            }
        }
        return null;
    }

    /**
     * 从数据库已有的 POI 构建名称 → poiId 映射
     */
    private void buildPoiNameMap() {
        List<Poi> allPois = poiRepository.findAll();
        nameToPoiIdMap = allPois.stream()
                .collect(Collectors.toMap(
                        Poi::getName,
                        Poi::getPoiId,
                        (existing, replacement) -> existing // 重复时保留第一个
                ));
        log.info("已构建 {} 个POI名称映射", nameToPoiIdMap.size());
    }

    /**
     * 判断是否为旺季（7-8月 和 10月）
     */
    private boolean isPeakSeason(LocalDate date) {
        if (date == null) return false;
        int month = date.getMonthValue();
        return month == 7 || month == 8 || month == 10;
    }

    // ==================== CSV 解析辅助 ====================

    /**
     * 解析一行 CSV（处理引号中的逗号和换行）
     */
    private String[] parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder currentField = new StringBuilder();

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    currentField.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                fields.add(currentField.toString().trim());
                currentField = new StringBuilder();
            } else {
                currentField.append(c);
            }
        }
        fields.add(currentField.toString().trim());

        return fields.toArray(new String[0]);
    }

    private String getField(String[] fields, int index) {
        return index < fields.length ? fields[index].trim() : "";
    }

    private String getField(String[] fields, int index, String defaultValue) {
        String val = getField(fields, index);
        return val.isEmpty() ? defaultValue : val;
    }

    private Integer parseInt(String s) {
        if (s == null || s.trim().isEmpty()) return null;
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Integer parseInt(String s, int defaultValue) {
        Integer val = parseInt(s);
        return val != null ? val : defaultValue;
    }

    private BigDecimal parseBigDecimal(String s) {
        if (s == null || s.trim().isEmpty()) return BigDecimal.ZERO;
        try {
            return new BigDecimal(s.trim());
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }
}
