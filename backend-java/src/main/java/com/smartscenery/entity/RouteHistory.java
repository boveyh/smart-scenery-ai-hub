package com.smartscenery.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 游览路线历史 — 对应 t_route_history 表
 * 记录路线推荐的请求、结果和反馈
 */
@Entity
@Table(name = "t_route_history", indexes = {
        @Index(name = "idx_tenant", columnList = "tenantId"),
        @Index(name = "idx_tourist", columnList = "touristId"),
        @Index(name = "idx_created", columnList = "createdAt")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 路线唯一编码 */
    @Column(nullable = false, length = 64)
    private String routeId;

    /** 租户ID */
    @Column(nullable = false, length = 64)
    private String tenantId;

    /** 会话ID */
    @Column(length = 64)
    private String sessionId;

    /** 游客ID（可选，登录后关联） */
    @Column(length = 32)
    private String touristId;

    /** 偏好（JSON，兴趣/节奏/同行人） */
    @Column(columnDefinition = "TEXT")
    private String preferences;

    /** POI顺序列表（JSON数组） */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String poiSequence;

    /** 预估时长（分钟） */
    private Integer estimatedTime;

    /** 实际耗时（分钟） */
    private Integer actualTime;

    /** 游客评分 1-5 */
    private Integer feedbackScore;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
