package com.smartscenery.service;

import com.smartscenery.entity.KnowledgeChunk;
import com.smartscenery.entity.OfflineKnowledge;
import com.smartscenery.exception.BusinessException;
import com.smartscenery.repository.KnowledgeChunkRepository;
import com.smartscenery.repository.OfflineKnowledgeRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
public class AdminKnowledgeService {

    @Autowired private KnowledgeChunkRepository knowledgeChunkRepository;
    @Autowired private OfflineKnowledgeRepository offlineKnowledgeRepository;

    public List<KnowledgeChunk> getKnowledgeList(String tenantId) {
        return knowledgeChunkRepository.findByTenantIdAndEnabledTrue(tenantId);
    }

    public List<KnowledgeChunk> searchKnowledge(String tenantId, String keyword) {
        try {
            return knowledgeChunkRepository.fullTextSearch(tenantId, keyword, 50);
        } catch (Exception e) {
            return knowledgeChunkRepository.keywordSearch(tenantId, keyword, 50);
        }
    }

    @Transactional
    public KnowledgeChunk createKnowledge(KnowledgeChunk chunk) {
        if (chunk.getChunkId() == null || chunk.getChunkId().isBlank()) {
            chunk.setChunkId("k_" + UUID.randomUUID().toString().substring(0, 8));
        }
        chunk.setEnabled(true);
        return knowledgeChunkRepository.save(chunk);
    }

    @Transactional
    public KnowledgeChunk updateKnowledge(Long id, KnowledgeChunk updated) {
        KnowledgeChunk existing = knowledgeChunkRepository.findById(id)
                .orElseThrow(() -> BusinessException.notFound("知识条目不存在"));
        if (updated.getTitle() != null) existing.setTitle(updated.getTitle());
        if (updated.getContent() != null) existing.setContent(updated.getContent());
        if (updated.getTags() != null) existing.setTags(updated.getTags());
        if (updated.getPoiId() != null) existing.setPoiId(updated.getPoiId());
        if (updated.getSource() != null) existing.setSource(updated.getSource());
        return knowledgeChunkRepository.save(existing);
    }

    @Transactional
    public void deleteKnowledge(Long id) {
        KnowledgeChunk chunk = knowledgeChunkRepository.findById(id)
                .orElseThrow(() -> BusinessException.notFound("知识条目不存在"));
        chunk.setEnabled(false);
        knowledgeChunkRepository.save(chunk);
    }

    @Transactional
    public KnowledgeChunk batchCreate(List<KnowledgeChunk> chunks) {
        KnowledgeChunk last = null;
        for (KnowledgeChunk chunk : chunks) {
            last = createKnowledge(chunk);
        }
        return last;
    }

    public List<OfflineKnowledge> getFaqList(String tenantId) {
        return offlineKnowledgeRepository.findByTenantId(tenantId);
    }

    @Transactional
    public OfflineKnowledge createFaq(OfflineKnowledge faq) {
        return offlineKnowledgeRepository.save(faq);
    }

    @Transactional
    public OfflineKnowledge updateFaq(Long id, OfflineKnowledge updated) {
        OfflineKnowledge existing = offlineKnowledgeRepository.findById(id)
                .orElseThrow(() -> BusinessException.notFound("FAQ不存在"));
        if (updated.getQuestion() != null) existing.setQuestion(updated.getQuestion());
        if (updated.getAnswer() != null) existing.setAnswer(updated.getAnswer());
        return offlineKnowledgeRepository.save(existing);
    }

    @Transactional
    public void deleteFaq(Long id) {
        offlineKnowledgeRepository.deleteById(id);
    }
}
