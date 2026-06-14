package com.smartscenery.service;

import com.smartscenery.dto.PoiDTO;
import com.smartscenery.dto.RealtimeInfoDTO;
import com.smartscenery.dto.RealtimeInfoDTO.PeakPoiDTO;
import com.smartscenery.entity.RealtimeInfo;
import com.smartscenery.filter.TenantContext;
import com.smartscenery.repository.RealtimeInfoRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 实时资讯服务
 */
@Slf4j
@Service
public class RealtimeInfoService {

    @Autowired
    private RealtimeInfoRepository realtimeInfoRepository;

    @Autowired
    private PoiService poiService;

    /**
     * 获取景区实时资讯
     */
    public RealtimeInfoDTO getRealtimeInfo() {
        String tenantId = TenantContext.getTenantId();
        RealtimeInfo info = realtimeInfoRepository.findByTenantId(tenantId).orElse(null);

        // 获取当前租户下拥挤度最高的景点（peakPois）
        List<PeakPoiDTO> peakPois = buildPeakPois(tenantId);

        if (info == null) {
            // 返回默认数据 + peakPois
            return RealtimeInfoDTO.builder()
                    .weather("晴")
                    .temperature(java.math.BigDecimal.valueOf(26))
                    .crowdednessLevel(1)
                    .announcements(Collections.emptyList())
                    .peakPois(peakPois)
                    .build();
        }

        RealtimeInfoDTO dto = RealtimeInfoDTO.fromEntity(info);
        dto.setPeakPois(peakPois);
        return dto;
    }

    /**
     * 构建热门景点拥挤度列表（拥挤度 >= 3 的景点，按拥挤度降序）
     */
    private List<PeakPoiDTO> buildPeakPois(String tenantId) {
        try {
            List<PoiDTO> crowdedPois = poiService.getCrowdedPois(3);
            return crowdedPois.stream()
                    .sorted(Comparator.comparingInt(PoiDTO::getCrowdedness).reversed())
                    .limit(10)
                    .map(p -> PeakPoiDTO.builder()
                            .poiId(p.getPoiId())
                            .name(p.getName())
                            .crowdedness(p.getCrowdedness())
                            .build())
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("获取热门景点拥挤度失败: {}", e.getMessage());
            return Collections.emptyList();
        }
    }
}
