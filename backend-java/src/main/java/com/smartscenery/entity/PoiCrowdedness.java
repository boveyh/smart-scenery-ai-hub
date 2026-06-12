package com.smartscenery.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 景点实时拥挤度明细 — 对应 t_poi_crowdedness 表
 * 记录每个POI不同时间点的拥挤度，支持趋势分析
 */
@Entity
@Table(name = "t_poi_crowdedness", indexes = {
        @Index(name = "idx_poi_time", columnList = "tenantId, poiId, recordTime"),
        @Index(name = "idx_time", columnList = "recordTime")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoiCrowdedness {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 租户ID */
    @Column(nullable = false, length = 64)
    private String tenantId;

    /** POI编码 */
    @Column(nullable = false, length = 64)
    private String poiId;

    /** 拥挤度 1-5 */
    @Column(nullable = false)
    private Integer crowdedness;

    /** 数据来源：manual/ai_predicted/sensor */
    @Column(length = 32)
    @Builder.Default
    private String crowdSource = "manual";

    /** 记录时间 */
    @Column(nullable = false)
    private LocalDateTime recordTime;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (recordTime == null) {
            recordTime = LocalDateTime.now();
        }
    }
}
