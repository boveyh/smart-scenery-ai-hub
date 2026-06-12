package com.smartscenery.service;

import com.smartscenery.dto.RealtimeInfoDTO;
import com.smartscenery.entity.RealtimeInfo;
import com.smartscenery.filter.TenantContext;
import com.smartscenery.repository.RealtimeInfoRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 实时资讯服务
 */
@Slf4j
@Service
public class RealtimeInfoService {

    @Autowired
    private RealtimeInfoRepository realtimeInfoRepository;

    /**
     * 获取景区实时资讯
     */
    public RealtimeInfoDTO getRealtimeInfo() {
        String tenantId = TenantContext.getTenantId();
        RealtimeInfo info = realtimeInfoRepository.findByTenantId(tenantId).orElse(null);

        if (info == null) {
            // 返回默认数据
            return RealtimeInfoDTO.builder()
                    .weather("晴")
                    .temperature(java.math.BigDecimal.valueOf(26))
                    .crowdednessLevel(1)
                    .announcements(java.util.Collections.emptyList())
                    .build();
        }

        return RealtimeInfoDTO.fromEntity(info);
    }
}
