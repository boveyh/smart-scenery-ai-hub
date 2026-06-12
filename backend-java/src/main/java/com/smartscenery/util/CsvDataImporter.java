package com.smartscenery.util;

import com.smartscenery.entity.TouristBehavior;
import com.smartscenery.repository.TouristBehaviorRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * 游客行为 CSV 数据导入工具
 * 应用完全启动后，自动扫描并加载项目根目录下的景点景区旅游数据CSV文件
 */
@Slf4j
@Component
public class CsvDataImporter {

    @Autowired
    private TouristBehaviorRepository touristBehaviorRepository;

    private static final String CSV_FILE_NAME = "景点景区旅游数据行为分析数据 - 副本.csv";

    @EventListener(ApplicationReadyEvent.class)
    public void importCsvData() {
        if (touristBehaviorRepository.count() > 0) {
            log.info("游客行为数据表已有数据，跳过 CSV 导入");
            return;
        }

        // 尝试在多个可能的位置查找CSV文件
        String userDir = System.getProperty("user.dir");
        List<String> searchPaths = List.of(
                CSV_FILE_NAME,
                "../" + CSV_FILE_NAME,
                "../../" + CSV_FILE_NAME,
                "D:/Projects_for_study/smart-scenery-ai-hub/" + CSV_FILE_NAME,
                userDir + "/" + CSV_FILE_NAME
        );

        Path csvPath = null;
        for (String path : searchPaths) {
            Path p = Paths.get(path);
            if (Files.exists(p)) {
                csvPath = p;
                break;
            }
        }

        if (csvPath == null) {
            log.warn("未找到CSV数据文件: {}，游客行为数据导入跳过", CSV_FILE_NAME);
            return;
        }

        log.info("开始导入CSV游客行为数据: {}", csvPath.toAbsolutePath());

        try {
            List<String> lines = Files.readAllLines(csvPath, StandardCharsets.UTF_8);
            if (lines.size() < 2) {
                log.warn("CSV文件为空或只有标题行");
                return;
            }

            // 解析表头
            String headerLine = lines.get(0);
            String[] headers = parseCsvLine(headerLine);
            log.info("CSV表头: {}", (Object) headers);

            DateTimeFormatter dateFormatter = DateTimeFormatter.ofPattern("yyyy/M/d");

            List<TouristBehavior> batch = new ArrayList<>();
            int totalSuccess = 0;
            int totalFail = 0;

            for (int i = 1; i < lines.size(); i++) {
                String line = lines.get(i).trim();
                if (line.isEmpty()) continue;

                try {
                    String[] fields = parseCsvLine(line);
                    TouristBehavior record = parseTouristBehavior(fields, dateFormatter);
                    if (record != null) {
                        batch.add(record);
                        totalSuccess++;
                    } else {
                        totalFail++;
                    }
                } catch (Exception e) {
                    totalFail++;
                    if (totalFail <= 5) {
                        log.warn("第{}行解析失败: {}", i + 1, e.getMessage());
                    }
                }

                // 批量保存，每500条一次
                if (batch.size() >= 500) {
                    touristBehaviorRepository.saveAll(batch);
                    log.info("已导入 {} 条游客行为记录...", totalSuccess);
                    batch.clear();
                }
            }

            // 保存剩余批次
            if (!batch.isEmpty()) {
                touristBehaviorRepository.saveAll(batch);
            }

            log.info("✅ CSV游客行为数据导入完成: 成功{}条, 失败{}条", totalSuccess, totalFail);

        } catch (IOException e) {
            log.error("CSV文件读取失败: {}", e.getMessage(), e);
        }
    }

    /**
     * 解析一行CSV（简单处理引号中的逗号）
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

    /**
     * 将CSV字段解析为 TouristBehavior 实体
     */
    private TouristBehavior parseTouristBehavior(String[] fields, DateTimeFormatter dateFormatter) {
        // CSV列顺序: tourist_id, user_nickname, age, gender, attraction_name, attraction_content, attraction_type, visit_date, stay_duration, ticket_cost, food_cost, shopping_cost, transport_cost, entertainment_cost, total_cost, group_size, satisfaction
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

            return TouristBehavior.builder()
                    .touristId(touristId)
                    .userNickname(nickname)
                    .age(age)
                    .gender(gender)
                    .attractionName(attractionName)
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
                    .build();
        } catch (Exception e) {
            log.warn("解析游客行为记录失败: {}", e.getMessage());
            return null;
        }
    }

    private Integer parseInt(String s) {
        if (s == null || s.trim().isEmpty()) return 0;
        try {
            return Integer.parseInt(s.trim());
        } catch (NumberFormatException e) {
            return 0;
        }
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
