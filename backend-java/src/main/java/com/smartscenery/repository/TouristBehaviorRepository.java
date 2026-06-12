package com.smartscenery.repository;

import com.smartscenery.entity.TouristBehavior;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface TouristBehaviorRepository extends JpaRepository<TouristBehavior, Long> {

    List<TouristBehavior> findByTenantId(String tenantId);

    List<TouristBehavior> findByTouristId(String touristId);

    List<TouristBehavior> findByTenantIdAndVisitDateBetween(String tenantId, LocalDate start, LocalDate end);

    List<TouristBehavior> findByPoiId(String poiId);

    /** 按景点聚合统计游客数量 */
    @Query(value = """
            SELECT tb.poi_id, tb.attraction_name, COUNT(*) as visit_count,
                   AVG(tb.satisfaction) as avg_satisfaction,
                   AVG(tb.total_cost) as avg_cost,
                   AVG(tb.stay_duration) as avg_stay
            FROM t_tourist_behavior tb
            WHERE tb.tenant_id = :tenantId
            GROUP BY tb.poi_id, tb.attraction_name
            ORDER BY visit_count DESC
            """, nativeQuery = true)
    List<Object[]> aggregateByPoi(@Param("tenantId") String tenantId);

    /** 按年龄分组统计 */
    @Query(value = """
            SELECT CASE
                WHEN age < 18 THEN '0-17'
                WHEN age BETWEEN 18 AND 24 THEN '18-24'
                WHEN age BETWEEN 25 AND 34 THEN '25-34'
                WHEN age BETWEEN 35 AND 44 THEN '35-44'
                WHEN age BETWEEN 45 AND 59 THEN '45-59'
                ELSE '60+'
            END as age_group,
            COUNT(*) as count,
            AVG(satisfaction) as avg_satisfaction,
            AVG(total_cost) as avg_cost
            FROM t_tourist_behavior
            WHERE tenant_id = :tenantId
            GROUP BY age_group
            ORDER BY age_group
            """, nativeQuery = true)
    List<Object[]> aggregateByAgeGroup(@Param("tenantId") String tenantId);

    /** 按满意度统计 */
    List<TouristBehavior> findByTenantIdAndSatisfaction(String tenantId, Integer satisfaction);
}
