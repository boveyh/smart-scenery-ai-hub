package com.smartscenery.dto;

import com.smartscenery.entity.RealtimeInfo;
import com.smartscenery.util.JsonUtils;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private Integer temperature;
    private Integer crowdednessLevel;
    private List<String> peakPois;
    private List<String> announcements;

    public static RealtimeInfoDTO fromEntity(RealtimeInfo entity) {
        List<String> peakPoisList = Collections.emptyList();
        List<String> announcementsList = Collections.emptyList();

        try {
            if (entity.getPeakPois() != null && !entity.getPeakPois().isBlank()) {
                peakPoisList = JsonUtils.fromJson(entity.getPeakPois(),
                        new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
            }
            if (entity.getAnnouncements() != null && !entity.getAnnouncements().isBlank()) {
                announcementsList = JsonUtils.fromJson(entity.getAnnouncements(),
                        new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {});
            }
        } catch (Exception ignored) {}

        return RealtimeInfoDTO.builder()
                .weather(entity.getWeather())
                .temperature(entity.getTemperature())
                .crowdednessLevel(entity.getCrowdednessLevel())
                .peakPois(peakPoisList)
                .announcements(announcementsList)
                .build();
    }
}
