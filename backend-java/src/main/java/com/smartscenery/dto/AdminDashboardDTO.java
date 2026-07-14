package com.smartscenery.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDashboardDTO {

    private OverviewDTO overview;
    private List<DailyTrend> dailyTrend;
    private List<TopicStat> hotTopics;
    private List<SentimentStat> sentimentStats;
    private List<PoiStat> poiStats;
    private List<AgeGroupStat> ageGroupStats;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OverviewDTO {
        private long todayServiceCount;
        private long weeklyServiceCount;
        private long totalPois;
        private long totalKnowledge;
        private double avgSatisfaction;
        private int activeTenants;
        private double satisfactionTrend;
        private long serviceCountChange;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DailyTrend {
        private String date;
        private long count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TopicStat {
        private String topic;
        private long count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SentimentStat {
        private String sentiment;
        private long count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PoiStat {
        private String poiId;
        private String poiName;
        private long visitCount;
        private double avgSatisfaction;
        private double avgCost;
        private double avgStay;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AgeGroupStat {
        private String ageGroup;
        private long count;
        private double avgSatisfaction;
        private double avgCost;
    }
}
