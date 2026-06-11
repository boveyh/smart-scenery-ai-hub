package com.smartscenery.controller;

import com.smartscenery.dto.ApiResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * 健康检查接口 — AI 引擎 Python 端也呼应此结构
 * 对应 API 文档 §1
 */
@RestController
@RequestMapping("/api/v1")
public class HealthController {

    @Value("${spring.application.name:smart-scenery-backend}")
    private String appName;

    @GetMapping("/health")
    public ApiResult<Map<String, Object>> health() {
        return ApiResult.success(Map.of(
                "status", "ok",
                "app", appName,
                "timestamp", Instant.now().toEpochMilli()
        ));
    }
}
