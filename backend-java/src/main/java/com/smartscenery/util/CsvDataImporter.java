package com.smartscenery.util;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/**
 * 游客行为 CSV 数据导入工具（旧版入口）
 *
 * 应用完全启动后，自动扫描并加载项目根目录下的景点景区旅游数据CSV文件。
 *
 * ⚠️ 该文件保留以便向后兼容，核心逻辑已迁移至 CsvImportRunner。
 * 建议使用新的通用导入器：
 *   java -jar app.jar --csv-import=tourist_behavior
 *   或
 *   java -jar app.jar --csv-import=all
 */
@Slf4j
@Component
public class CsvDataImporter {

    @Autowired
    private CsvImportRunner csvImportRunner;
    @EventListener(ApplicationReadyEvent.class)
    public void importCsvData() {
        log.info("CsvDataImporter: 委托给 CsvImportRunner 执行默认导入");
        csvImportRunner.importSingleTable("tourist_behavior", false);
    }
}

