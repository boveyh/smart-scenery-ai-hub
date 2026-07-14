package com.smartscenery.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 景点 POI 实体 — 对应 t_poi 表
 */
@Entity
@Table(name = "t_poi", indexes = {
        @Index(name = "idx_tenant_category", columnList = "tenantId, category"),
        @Index(name = "idx_tenant_location", columnList = "tenantId, lat, lng"),
        @Index(name = "idx_crowdedness", columnList = "tenantId, crowdedness")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Poi {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 租户ID（多租户隔离） */
    @Column(nullable = false, length = 64)
    private String tenantId;

    /** POI 唯一编码（业务主键） */
    @Column(nullable = false, length = 64)
    private String poiId;

    /** 景点名称 */
    @Column(nullable = false, length = 128)
    private String name;

    /** 分类：历史文化/自然风光/主题乐园/博物馆与展馆/古镇水乡/风景名胜与休闲度假/自然公园 */
    @Column(length = 64)
    private String category;

    /** 子分类（细化） */
    @Column(length = 64)
    private String subCategory;

    /** 纬度 */
    @Column(nullable = false, columnDefinition = "DOUBLE")
    private BigDecimal lat;

    /** 经度 */
    @Column(nullable = false, columnDefinition = "DOUBLE")
    private BigDecimal lng;

    /** 详细地址 */
    @Column(length = 256)
    private String address;

    /** 景点简介（摘要，200字内） */
    @Column(columnDefinition = "TEXT")
    private String description;

    /** 景点详细介绍（结构化文本） */
    @Column(columnDefinition = "MEDIUMTEXT")
    private String detailContent;

    /** 建议停留时长（分钟） */
    @Column(name = "avg_stay_min")
    private Integer avgStayMin;

    /** 开放时间 */
    @Column(length = 128)
    private String openingHours;

    /** 门票价格（0表示免费） */
    @Column(columnDefinition = "DOUBLE")
    @Builder.Default
    private BigDecimal ticketPrice = BigDecimal.ZERO;

    /** 封面图片URL */
    @Column(length = 512)
    private String imageUrl;

    /** 当前拥挤度 1-5 */
    @Column(nullable = false)
    @Builder.Default
    private Integer crowdedness = 1;

    /** 排序权重 */
    @Column(nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    /** 是否启用 */
    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
