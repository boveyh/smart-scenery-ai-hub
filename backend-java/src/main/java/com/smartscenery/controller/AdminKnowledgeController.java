package com.smartscenery.controller;

import com.smartscenery.dto.ApiResult;
import com.smartscenery.entity.KnowledgeChunk;
import com.smartscenery.entity.OfflineKnowledge;
import com.smartscenery.filter.TenantContext;
import com.smartscenery.service.AdminKnowledgeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/knowledge")
public class AdminKnowledgeController {

    @Autowired private AdminKnowledgeService knowledgeService;

    @GetMapping("/chunks")
    public ApiResult<List<KnowledgeChunk>> listKnowledge() {
        return ApiResult.success(knowledgeService.getKnowledgeList(TenantContext.getTenantId()));
    }

    @GetMapping("/chunks/search")
    public ApiResult<List<KnowledgeChunk>> searchKnowledge(@RequestParam String keyword) {
        return ApiResult.success(knowledgeService.searchKnowledge(TenantContext.getTenantId(), keyword));
    }

    @PostMapping("/chunks")
    public ApiResult<KnowledgeChunk> createKnowledge(@RequestBody KnowledgeChunk chunk) {
        chunk.setTenantId(TenantContext.getTenantId());
        return ApiResult.success(knowledgeService.createKnowledge(chunk));
    }

    @PutMapping("/chunks/{id}")
    public ApiResult<KnowledgeChunk> updateKnowledge(@PathVariable Long id, @RequestBody KnowledgeChunk updated) {
        return ApiResult.success(knowledgeService.updateKnowledge(id, updated));
    }

    @DeleteMapping("/chunks/{id}")
    public ApiResult<Void> deleteKnowledge(@PathVariable Long id) {
        knowledgeService.deleteKnowledge(id);
        return ApiResult.success();
    }

    @PostMapping("/chunks/batch")
    public ApiResult<KnowledgeChunk> batchCreate(@RequestBody List<KnowledgeChunk> chunks) {
        chunks.forEach(c -> c.setTenantId(TenantContext.getTenantId()));
        return ApiResult.success(knowledgeService.batchCreate(chunks));
    }

    @GetMapping("/faq")
    public ApiResult<List<OfflineKnowledge>> listFaq() {
        return ApiResult.success(knowledgeService.getFaqList(TenantContext.getTenantId()));
    }

    @PostMapping("/faq")
    public ApiResult<OfflineKnowledge> createFaq(@RequestBody OfflineKnowledge faq) {
        faq.setTenantId(TenantContext.getTenantId());
        return ApiResult.success(knowledgeService.createFaq(faq));
    }

    @PutMapping("/faq/{id}")
    public ApiResult<OfflineKnowledge> updateFaq(@PathVariable Long id, @RequestBody OfflineKnowledge updated) {
        return ApiResult.success(knowledgeService.updateFaq(id, updated));
    }

    @DeleteMapping("/faq/{id}")
    public ApiResult<Void> deleteFaq(@PathVariable Long id) {
        knowledgeService.deleteFaq(id);
        return ApiResult.success();
    }
}
