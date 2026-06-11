package com.smartscenery.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 景区实时资讯 — 对应 API 文档 §4.4
 * 每个租户只有一条最新记录
 */
@Entity
@Table(name = "t_realtime_info", uniqueConstraints = {
        @UniqueConstraint(columnNames = "tenantId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RealtimeInfo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 租户ID */
    @Column(nullable = false, unique = true, length = 64)
    private String tenantId;

    /** 天气 */
    @Column(length = 32)
    private String weather;

    /** 温度 */
    private Integer temperature;

    /** 整体拥挤等级 1-5 */
    @Column(nullable = false)
    @Builder.Default
    private Integer crowdednessLevel = 1;

    /** 拥挤的POI列表（JSON数组字符串，如 ["poi_001","poi_002"]） */
    @Column(columnDefinition = "TEXT")
    private String peakPois;

    /** 公告内容（JSON数组字符串） */
    @Column(columnDefinition = "TEXT")
    private String announcements;

    /** 更新时间 */
    @Column(nullable = false)
    private LocalDateTime updateTime;
}
