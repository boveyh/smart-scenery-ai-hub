package com.smartscenery.controller;

import com.smartscenery.dto.ApiResult;
import com.smartscenery.service.OfflineKnowledgeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 离线知识库接口 — 对应 API 文档 §4.5
 * 弱网环境前端缓存降级兜底
 */
@RestController
@RequestMapping("/api/v1/knowledge")
public class OfflineKnowledgeController {

    @Autowired
    private OfflineKnowledgeService offlineKnowledgeService;

    /**
     * 获取离线知识库 FAQ
     * GET /api/v1/knowledge/offline
     */
    @GetMapping("/offline")
    public ApiResult<Map<String, String>> getOfflineKnowledge() {
        Map<String, String> knowledge = offlineKnowledgeService.getOfflineKnowledge();
        return ApiResult.success(knowledge);
    }
}
