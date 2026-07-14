package com.smartscenery.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 景区实时资讯 — 对应 t_realtime_info 表
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

    /** 温度（摄氏度） */
    @Column(columnDefinition = "DOUBLE")
    private BigDecimal temperature;

    /** 湿度百分比 */
    private Integer humidity;

    /** 风速(m/s) */
    @Column(columnDefinition = "DOUBLE")
    private BigDecimal windSpeed;

    /** 整体拥挤等级 1-5 */
    @Column(nullable = false)
    @Builder.Default
    private Integer crowdednessLevel = 1;

    /** 公告内容（JSON数组字符串，如 ["今日索道检修","..."]） */
    @Column(columnDefinition = "TEXT")
    private String announcements;

    /** 更新时间 */
    @Column(nullable = false)
    private LocalDateTime updateTime;

    @PrePersist
    protected void onCreate() {
        if (updateTime == null) {
            updateTime = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updateTime = LocalDateTime.now();
    }
}
