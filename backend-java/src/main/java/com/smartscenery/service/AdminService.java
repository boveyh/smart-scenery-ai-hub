package com.smartscenery.service;

import com.smartscenery.dto.AdminDashboardDTO;
import com.smartscenery.dto.AdminDashboardDTO.*;
import com.smartscenery.entity.KnowledgeChunk;
import com.smartscenery.entity.Tenant;
import com.smartscenery.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class AdminService {

    @Autowired private ConversationLogRepository conversationLogRepository;
    @Autowired private TouristBehaviorRepository touristBehaviorRepository;
    @Autowired private PoiRepository poiRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private KnowledgeChunkRepository knowledgeChunkRepository;
    @Autowired private OfflineKnowledgeRepository offlineKnowledgeRepository;

    public AdminDashboardDTO getDashboard(String tenantId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime todayStart = now.toLocalDate().atStartOfDay();
        LocalDateTime weekStart = now.minusDays(7).toLocalDate().atStartOfDay();
        LocalDateTime monthStart = now.minusDays(30).toLocalDate().atStartOfDay();

        long todayCount = conversationLogRepository.countByTenantIdAndCreatedAtBetween(tenantId, todayStart, now);
        long weekCount = conversationLogRepository.countByTenantIdAndCreatedAtBetween(tenantId, weekStart, now);
        long yesterdayCount = conversationLogRepository.countByTenantIdAndCreatedAtBetween(tenantId, todayStart.minusDays(1), todayStart);

        List<Object[]> poiAgg = touristBehaviorRepository.aggregateByPoi(tenantId);
        List<Object[]> ageAgg = touristBehaviorRepository.aggregateByAgeGroup(tenantId);

        double avgSat = poiAgg.stream()
                .mapToDouble(r -> r[2] != null ? ((Number) r[2]).doubleValue() : 0)
                .average().orElse(0);

        List<Tenant> tenants = tenantRepository.findAll();
        long activeTenants = tenants.stream().filter(t -> t.getStatus() == 1).count();

        long poiCount = poiRepository.findByTenantIdAndEnabledTrueOrderBySortOrder(tenantId).size();
        long knowledgeCount = knowledgeChunkRepository.findByTenantIdAndEnabledTrue(tenantId).size();

        double satTrend = yesterdayCount > 0
                ? (double) (todayCount - yesterdayCount) / yesterdayCount * 100
                : 0;
        long serviceChange = todayCount - yesterdayCount;

        OverviewDTO overview = OverviewDTO.builder()
                .todayServiceCount(todayCount)
                .weeklyServiceCount(weekCount)
                .totalPois(poiCount)
                .totalKnowledge(knowledgeCount)
                .avgSatisfaction(Math.round(avgSat * 100.0) / 100.0)
                .activeTenants((int) activeTenants)
                .satisfactionTrend(Math.round(satTrend * 100.0) / 100.0)
                .serviceCountChange(serviceChange)
                .build();

        List<Object[]> dailyRaw = conversationLogRepository.dailyConversationCount(tenantId, weekStart);
        List<DailyTrend> dailyTrend = dailyRaw.stream().map(r -> DailyTrend.builder()
                .date(r[0].toString())
                .count(((Number) r[1]).longValue())
                .build()).collect(Collectors.toList());

        List<Object[]> topicRaw = conversationLogRepository.aggregateTopics(tenantId, monthStart);
        List<TopicStat> hotTopics = topicRaw.stream().map(r -> TopicStat.builder()
                .topic((String) r[0])
                .count(((Number) r[1]).longValue())
                .build()).collect(Collectors.toList());

        List<Object[]> sentRaw = conversationLogRepository.aggregateSentiment(tenantId, monthStart);
        List<SentimentStat> sentimentStats = sentRaw.stream().map(r -> SentimentStat.builder()
                .sentiment((String) r[0])
                .count(((Number) r[1]).longValue())
                .build()).collect(Collectors.toList());

        List<PoiStat> poiStats = poiAgg.stream().map(r -> PoiStat.builder()
                .poiId((String) r[0])
                .poiName((String) r[1])
                .visitCount(((Number) r[2]).longValue())
                .avgSatisfaction(r[3] != null ? ((Number) r[3]).doubleValue() : 0)
                .avgCost(r[4] != null ? ((Number) r[4]).doubleValue() : 0)
                .avgStay(r[5] != null ? ((Number) r[5]).doubleValue() : 0)
                .build()).collect(Collectors.toList());

        List<AgeGroupStat> ageGroupStats = ageAgg.stream().map(r -> AgeGroupStat.builder()
                .ageGroup((String) r[0])
                .count(((Number) r[1]).longValue())
                .avgSatisfaction(r[2] != null ? ((Number) r[2]).doubleValue() : 0)
                .avgCost(r[3] != null ? ((Number) r[3]).doubleValue() : 0)
                .build()).collect(Collectors.toList());

        return AdminDashboardDTO.builder()
                .overview(overview)
                .dailyTrend(dailyTrend)
                .hotTopics(hotTopics)
                .sentimentStats(sentimentStats)
                .poiStats(poiStats)
                .ageGroupStats(ageGroupStats)
                .build();
    }
}
