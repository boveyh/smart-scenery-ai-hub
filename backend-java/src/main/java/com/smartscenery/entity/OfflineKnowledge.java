package com.smartscenery.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 离线知识库 FAQ — 对应 t_offline_knowledge 表
 * 弱网环境下，前端缓存该数据用于兜底回复
 */
@Entity
@Table(name = "t_offline_knowledge", indexes = {
        @Index(name = "idx_tenant_question", columnList = "tenantId, question")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfflineKnowledge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 租户ID */
    @Column(nullable = false, length = 64)
    private String tenantId;

    /** 问题关键词 */
    @Column(nullable = false, length = 256)
    private String question;

    /** 回答内容 */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String answer;

    /** 被点击次数（热门排序用） */
    @Builder.Default
    private Integer clickCount = 0;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
