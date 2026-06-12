package com.smartscenery.service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.smartscenery.dto.PoiDTO;
import com.smartscenery.entity.Poi;
import com.smartscenery.exception.BusinessException;
import com.smartscenery.filter.TenantContext;
import com.smartscenery.repository.PoiRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * POI 景点服务
 */
@Slf4j
@Service
public class PoiService {

    @Autowired
    private PoiRepository poiRepository;

    /**
     * 获取景点列表
     *
     * @param lat 纬度（可选，传参则按距离排序）
     * @param lng 经度（可选）
     * @return POI 列表
     */
    public List<PoiDTO> getPoiList(Double lat, Double lng) {
        String tenantId = TenantContext.getTenantId();

        if (lat != null && lng != null) {
            // 按距离排序
            BigDecimal bdLat = BigDecimal.valueOf(lat);
            BigDecimal bdLng = BigDecimal.valueOf(lng);
            List<Object[]> rawResults = poiRepository.findNearbyPois(tenantId, bdLat, bdLng);
            List<PoiDTO> result = new ArrayList<>();
            for (Object[] row : rawResults) {
                Poi poi = (Poi) row[0];
                Double distance = (Double) row[1];
                result.add(PoiDTO.fromEntityWithDistance(poi, distance));
            }
            return result;
        }

        // 默认排序
        return poiRepository.findByTenantIdAndEnabledTrueOrderBySortOrder(tenantId)
                .stream()
                .map(PoiDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 根据分类获取景点
     */
    public List<PoiDTO> getPoisByCategory(String category) {
        String tenantId = TenantContext.getTenantId();
        return poiRepository.findByTenantIdAndCategoryAndEnabledTrue(tenantId, category)
                .stream()
                .map(PoiDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 获取拥挤景点列表（拥挤度 >= 阈值）
     */
    public List<PoiDTO> getCrowdedPois(int threshold) {
        String tenantId = TenantContext.getTenantId();
        return poiRepository.findByTenantIdAndCrowdednessGreaterThanEqual(tenantId, threshold)
                .stream()
                .map(PoiDTO::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * 根据 poiId 集合批量查询
     */
    public Map<String, PoiDTO> getPoiMapByIds(List<String> poiIds) {
        return poiIds.stream()
                .map(poiRepository::findByPoiId)
                .filter(java.util.Optional::isPresent)
                .map(java.util.Optional::get)
                .collect(Collectors.toMap(Poi::getPoiId, PoiDTO::fromEntity));
    }

    /**
     * 根据 poiId 查询单个景点
     */
    public PoiDTO getPoiById(String poiId) {
        Poi poi = poiRepository.findByPoiId(poiId)
                .orElseThrow(() -> BusinessException.notFound("景点不存在: " + poiId));
        return PoiDTO.fromEntity(poi);
    }
}
