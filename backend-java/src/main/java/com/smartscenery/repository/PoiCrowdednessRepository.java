package com.smartscenery.repository;

import com.smartscenery.entity.PoiCrowdedness;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PoiCrowdednessRepository extends JpaRepository<PoiCrowdedness, Long> {

    List<PoiCrowdedness> findByTenantIdAndPoiIdOrderByRecordTimeDesc(String tenantId, String poiId);

    List<PoiCrowdedness> findByTenantIdAndPoiIdAndRecordTimeBetween(
            String tenantId, String poiId, LocalDateTime start, LocalDateTime end);

    /** 获取最新的一条拥挤度记录 */
    PoiCrowdedness findTopByTenantIdAndPoiIdOrderByRecordTimeDesc(String tenantId, String poiId);
}
