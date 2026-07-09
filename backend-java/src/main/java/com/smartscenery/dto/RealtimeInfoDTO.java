package com.smartscenery.dto;

import com.smartscenery.entity.RealtimeInfo;
import com.smartscenery.util.JsonUtils;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

/**
 * 实时资讯响应 DTO — 对齐 API 文档 §4.4
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RealtimeInfoDTO {

    private String weather;
    private BigDecimal temperature;
    private Integer humidity;
    private BigDecimal windSpeed;
    private Integer crowdednessLevel;
    private List<String> announcements;
    /** 热门景点拥挤度列表，每个元素含 poiId/name/crowdedness */
    private List<PeakPoiDTO> peakPois;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PeakPoiDTO {
        private String poiId;
        private String name;
        private Integer crowdedness;
    }

    public static RealtimeInfoDTO fromEntity(RealtimeInfo entity) {
        List<String> announcementsList = Collections.emptyList();

        try {
            if (entity.getAnnouncements() != null && !entity.getAnnouncements().isBlank()) {
                announcementsList = JsonUtils.fromJson(entity.getAnnouncements(),
                        new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
            }
        } catch (Exception ignored) {}

        return RealtimeInfoDTO.builder()
                .weather(entity.getWeather())
                .temperature(entity.getTemperature())
                .humidity(entity.getHumidity())
                .windSpeed(entity.getWindSpeed())
                .crowdednessLevel(entity.getCrowdednessLevel())
                .announcements(announcementsList)
                .build();
    }
}
