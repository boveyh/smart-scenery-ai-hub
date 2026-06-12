package com.smartscenery.service;

import com.smartscenery.entity.PoiCrowdedness;
import com.smartscenery.filter.TenantContext;
import com.smartscenery.repository.PoiCrowdednessRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 景点拥挤度服务 — 支持拥挤度时序记录和趋势分析
 */
@Slf4j
@Service
public class PoiCrowdednessService {

    @Autowired
    private PoiCrowdednessRepository crowdednessRepository;

    /**
     * 记录当前拥挤度
     */
    public PoiCrowdedness recordCrowdedness(String poiId, Integer crowdedness, String source) {
        String tenantId = TenantContext.getTenantId();
        PoiCrowdedness record = PoiCrowdedness.builder()
                .tenantId(tenantId)
                .poiId(poiId)
                .crowdedness(crowdedness)
                .crowdSource(source != null ? source : "manual")
                .recordTime(LocalDateTime.now())
                .build();
        return crowdednessRepository.save(record);
    }

    /**
     * 查询某个POI的历史拥挤度
     */
    public List<PoiCrowdedness> getHistory(String poiId, int hours) {
        String tenantId = TenantContext.getTenantId();
        LocalDateTime start = LocalDateTime.now().minusHours(hours);
        return crowdednessRepository.findByTenantIdAndPoiIdAndRecordTimeBetween(
                tenantId, poiId, start, LocalDateTime.now());
    }

    /**
     * 获取最新的拥挤度记录
     */
    public PoiCrowdedness getLatest(String poiId) {
        String tenantId = TenantContext.getTenantId();
        return crowdednessRepository.findTopByTenantIdAndPoiIdOrderByRecordTimeDesc(tenantId, poiId);
    }
}
