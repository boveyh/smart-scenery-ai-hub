package com.smartscenery.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 知识库分片 — 对应 t_knowledge_chunk 表
 * RAG 检索的知识片段，支持全文检索
 */
@Entity
@Table(name = "t_knowledge_chunk", indexes = {
        @Index(name = "idx_tenant_poi", columnList = "tenantId, poiId"),
        @Index(name = "idx_tags", columnList = "tenantId, tags")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KnowledgeChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 租户ID */
    @Column(nullable = false, length = 64)
    private String tenantId;

    /** 分片唯一编码 */
    @Column(nullable = false, length = 64)
    private String chunkId;

    /** 关联POI（可选） */
    @Column(length = 64)
    private String poiId;

    /** 标题/主题 */
    @Column(length = 256)
    private String title;

    /** 知识片段内容 */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /** 标签（逗号分隔，用于检索） */
    @Column(length = 256)
    private String tags;

    /** 来源（如 docs/ling_shan.docx） */
    @Column(length = 64)
    private String source;

    /** 同文档内排序 */
    @Builder.Default
    private Integer chunkOrder = 0;

    @Builder.Default
    private Boolean enabled = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
