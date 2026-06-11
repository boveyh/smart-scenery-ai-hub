package com.smartscenery.repository;

import com.smartscenery.entity.Poi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PoiRepository extends JpaRepository<Poi, Long> {

    List<Poi> findByTenantIdAndEnabledTrueOrderBySortOrder(String tenantId);

    List<Poi> findByTenantIdAndCategoryAndEnabledTrue(String tenantId, String category);

    Optional<Poi> findByPoiId(String poiId);

    Optional<Poi> findByTenantIdAndPoiId(String tenantId, String poiId);

    /**
     * 按地理距离排序查询（近似计算，适用于小范围）
     * 使用简化公式：distance ≈ sqrt((lat1-lat2)^2 + (lng1-lng2)^2 * cos(avg_lat)^2) * 111320
     */
    @Query(value = """
            SELECT p.*, (
                6371000 * ACOS(
                    COS(RADIANS(:lat)) * COS(RADIANS(p.lat)) * COS(RADIANS(p.lng) - RADIANS(:lng))
                    + SIN(RADIANS(:lat)) * SIN(RADIANS(p.lat))
                )
            ) AS distance
            FROM t_poi p
            WHERE p.tenant_id = :tenantId AND p.enabled = true
            ORDER BY distance
            """, nativeQuery = true)
    List<Object[]> findNearbyPois(@Param("tenantId") String tenantId,
                                  @Param("lat") Double lat,
                                  @Param("lng") Double lng);

    List<Poi> findByTenantIdAndCrowdednessGreaterThanEqual(String tenantId, Integer crowdedness);
}
