package com.smartscenery.controller;

import com.smartscenery.dto.ApiResult;
import com.smartscenery.entity.KnowledgeChunk;
import com.smartscenery.repository.KnowledgeChunkRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 知识库检索接口 — 供 AI 引擎 RAG 调用
 * 
 * POST /api/admin/knowledge/search
 * 
 * AI 引擎 rag_processor.py 通过此接口检索景区知识片段
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/knowledge")
public class KnowledgeSearchController {

    @Autowired
    private KnowledgeChunkRepository knowledgeChunkRepository;

    /**
     * 知识检索（含关键词 fallback）
     * 
     * 请求体:
     *   { "tenant_id": "ling_shan", "query": "梵宫介绍", "top_k": 5 }
     * 
     * 响应:
     *   {
     *     "code": 200,
     *     "data": {
     *       "chunks": [
     *         { "content": "梵宫是灵山胜境的核心建筑...", "title": "梵宫", "source": "lingshan.docx" }
     *       ]
     *     }
     *   }
     */
    @PostMapping("/search")
    public ApiResult<Map<String, Object>> search(@RequestBody Map<String, Object> request) {
        String tenantId = (String) request.getOrDefault("tenant_id", "default");
        String query = (String) request.getOrDefault("query", "");
        int topK = request.containsKey("top_k") ? ((Number) request.get("top_k")).intValue() : 5;

        log.info("知识检索: tenant={}, query={}, top_k={}", tenantId, query, topK);

        // 1. 先用 LIKE 关键词检索（兼容 H2/MySQL）
        List<KnowledgeChunk> chunks;
        try {
            String cleanQuery = query.replaceAll("[^\\u4e00-\\u9fffA-Za-z0-9 ]", " ").trim();
            if (cleanQuery.length() > 1) {
                chunks = knowledgeChunkRepository.keywordSearch(tenantId, cleanQuery, topK);
            } else {
                chunks = knowledgeChunkRepository.findByTenantIdAndEnabledTrue(tenantId);
                chunks = chunks.stream().limit(topK).toList();
            }
        } catch (Exception e) {
            log.warn("检索失败，降级为全量查询: {}", e.getMessage());
            chunks = knowledgeChunkRepository.findByTenantIdAndEnabledTrue(tenantId);
            chunks = chunks.stream().limit(topK).toList();
        }

        // 2. 转换为 API 响应格式
        List<Map<String, String>> chunkList = chunks.stream()
                .map(c -> Map.of(
                        "content", c.getContent() != null ? c.getContent() : "",
                        "title", c.getTitle() != null ? c.getTitle() : "",
                        "source", c.getSource() != null ? c.getSource() : ""
                ))
                .collect(Collectors.toList());

        log.info("检索结果: {} 条匹配", chunkList.size());

        return ApiResult.success(Map.of("chunks", chunkList));
    }

    /**
     * 批量查询指定租户的全部知识（不分页）
     * GET /api/admin/knowledge/all?tenant_id=ling_shan
     */
    @GetMapping("/all")
    public ApiResult<Map<String, Object>> getAll(@RequestParam("tenant_id") String tenantId) {
        List<KnowledgeChunk> chunks = knowledgeChunkRepository.findByTenantIdAndEnabledTrue(tenantId);
        List<Map<String, String>> chunkList = chunks.stream()
                .map(c -> Map.of(
                        "content", c.getContent() != null ? c.getContent() : "",
                        "title", c.getTitle() != null ? c.getTitle() : "",
                        "source", c.getSource() != null ? c.getSource() : ""
                ))
                .toList();
        return ApiResult.success(Map.of("chunks", chunkList, "total", chunkList.size()));
    }
}