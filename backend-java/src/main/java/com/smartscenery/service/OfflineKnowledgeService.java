package com.smartscenery.service;

import com.smartscenery.filter.TenantContext;
import com.smartscenery.repository.OfflineKnowledgeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 离线知识库服务 — 对应 API 文档 §4.5
 * 返回键值对 FAQ，供前端缓存用于 AI 服务不可用时的降级兜底
 */
@Slf4j
@Service
public class OfflineKnowledgeService {

    @Autowired
    private OfflineKnowledgeRepository offlineKnowledgeRepository;

    /**
     * 获取离线知识库 FAQ
     */
    public Map<String, String> getOfflineKnowledge() {
        String tenantId = TenantContext.getTenantId();
        return offlineKnowledgeRepository.findByTenantId(tenantId)
                .stream()
                .collect(Collectors.toMap(
                        k -> k.getQuestion(),
                        k -> k.getAnswer(),
                        (v1, v2) -> v2,
                        LinkedHashMap::new
                ));
    }
}
