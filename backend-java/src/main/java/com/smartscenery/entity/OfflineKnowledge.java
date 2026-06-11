package com.smartscenery.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 离线知识库 FAQ — 对应 API 文档 §4.5
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
}
