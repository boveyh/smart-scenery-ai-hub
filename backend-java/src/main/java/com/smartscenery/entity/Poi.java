package com.smartscenery.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 景点 POI 实体 — 对应 API 文档 §4.1
 */
@Entity
@Table(name = "t_poi", indexes = {
        @Index(name = "idx_tenant_category", columnList = "tenantId, category"),
        @Index(name = "idx_tenant_location", columnList = "tenantId, lat, lng")
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
    @Column(nullable = false, unique = true, length = 64)
    private String poiId;

    /** 景点名称 */
    @Column(nullable = false, length = 128)
    private String name;

    /** 分类：历史文化/自然风光/休闲娱乐/餐饮/卫生间/入口 */
    @Column(length = 64)
    private String category;

    /** 纬度 */
    @Column(nullable = false)
    private Double lat;

    /** 经度 */
    @Column(nullable = false)
    private Double lng;

    /** 景点介绍 */
    @Column(columnDefinition = "TEXT")
    private String description;

    /** 建议停留时长（分钟） */
    @Column(name = "avg_stay_min")
    private Integer avgStayMin;

    /** 当前拥挤度 1-5 */
    @Column(nullable = false)
    @Builder.Default
    private Integer crowdedness = 1;

    /** 开放时间 */
    @Column(length = 128)
    private String openingHours;

    /** 封面图片URL */
    @Column(length = 512)
    private String imageUrl;

    /** 排序权重 */
    @Column(nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;

    /** 是否启用 */
    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;
}
