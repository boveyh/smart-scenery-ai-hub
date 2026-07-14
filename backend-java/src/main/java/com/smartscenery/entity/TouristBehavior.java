package com.smartscenery.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 游客行为 — 对应 t_tourist_behavior 表
 * 存储游客的游览行为、消费、满意度等数据
 */
@Entity
@Table(name = "t_tourist_behavior", indexes = {
        @Index(name = "idx_tourist", columnList = "touristId"),
        @Index(name = "idx_visit_date", columnList = "visitDate"),
        @Index(name = "idx_tenant_poi", columnList = "tenantId, poiId"),
        @Index(name = "idx_satisfaction", columnList = "tenantId, satisfaction"),
        @Index(name = "idx_cost", columnList = "tenantId, totalCost"),
        @Index(name = "idx_age_gender", columnList = "age, gender")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TouristBehavior {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 游客ID */
    @Column(nullable = false, length = 32)
    private String touristId;

    /** 游客昵称 */
    @Column(length = 64)
    private String userNickname;

    /** 年龄 */
    private Integer age;

    /** 性别 男/女 */
    @Column(length = 8)
    private String gender;

    /** 所在景区租户ID */
    @Column(nullable = false, length = 64)
    private String tenantId;

    /** 游览的景点名称 */
    @Column(nullable = false, length = 128)
    private String attractionName;

    /** 关联POI编码（可选，通过名称模糊匹配） */
    @Column(length = 64)
    private String poiId;

    /** 游览日期 */
    @Column(nullable = false)
    private LocalDate visitDate;

    /** 停留时长（小时） */
    @Column(columnDefinition = "DOUBLE")
    private BigDecimal stayDuration;

    /** 门票消费 */
    @Builder.Default
    private BigDecimal ticketCost = BigDecimal.ZERO;

    /** 餐饮消费 */
    @Builder.Default
    private BigDecimal foodCost = BigDecimal.ZERO;

    /** 购物消费 */
    @Builder.Default
    private BigDecimal shoppingCost = BigDecimal.ZERO;

    /** 交通消费 */
    @Builder.Default
    private BigDecimal transportCost = BigDecimal.ZERO;

    /** 娱乐消费 */
    @Builder.Default
    private BigDecimal entertainmentCost = BigDecimal.ZERO;

    /** 总消费 */
    @Builder.Default
    private BigDecimal totalCost = BigDecimal.ZERO;

    /** 同行人数 */
    @Builder.Default
    private Integer groupSize = 1;

    /** 满意度评分 1-5 */
    private Integer satisfaction;

    /** 到访小时（0-23） */
    private Integer visitHour;

    /** 是否旺季 */
    @Builder.Default
    private Boolean isPeakSeason = false;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
