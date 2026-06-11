package com.smartscenery.service;

import com.smartscenery.dto.PoiDTO;
import com.smartscenery.dto.RouteRequestDTO;
import com.smartscenery.dto.RouteResponseDTO;
import com.smartscenery.filter.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 路线推荐服务 — 错峰调度核心算法
 *
 * 策略：
 * 1. 根据游客偏好（兴趣、节奏、同行人）筛选 POI
 * 2. 结合实时拥挤度数据，自动绕开拥堵景点
 * 3. 生成推荐路线 + 出行提示
 */
@Slf4j
@Service
public class RouteService {

    @Autowired
    private PoiService poiService;

    /**
     * 推荐游览路线
     */
    public RouteResponseDTO recommendRoute(RouteRequestDTO request) {
        String tenantId = TenantContext.getTenantId();
        RouteRequestDTO.Preferences prefs = request.getPreferences();
        if (prefs == null) {
            prefs = new RouteRequestDTO.Preferences();
        }

        // 1. 获取所有景点
        List<PoiDTO> allPois = poiService.getPoiList(null, null);

        // 2. 按兴趣筛选
        List<PoiDTO> filtered = filterByInterest(allPois, prefs.getInterest());

        // 3. 按拥挤度排序（不拥挤的优先）
        filtered.sort(Comparator.comparingInt(PoiDTO::getCrowdedness)
                .thenComparing(PoiDTO::getName));

        // 4. 估算游览节奏
        int paceMultiplier = getPaceMultiplier(prefs.getPace());

        // 5. 从起始点开始，贪心选取路线
        List<String> poiSequence = new ArrayList<>();
        List<PoiDTO> selectedPois = new ArrayList<>();
        int totalTime = 0;
        int maxTime = prefs.getDurationMin() != null ? prefs.getDurationMin() : 180;

        String startPoiId = request.getStartPoiId();
        // 把起始点放在第一个
        Optional<PoiDTO> startPoi = filtered.stream()
                .filter(p -> p.getPoiId().equals(startPoiId))
                .findFirst();

        if (startPoi.isPresent()) {
            PoiDTO start = startPoi.get();
            poiSequence.add(start.getPoiId());
            selectedPois.add(start);
            int stayMin = start.getAvgStayMin() != null ? start.getAvgStayMin() : 30;
            totalTime += stayMin * paceMultiplier;
        }

        // 贪心选取剩余景点
        for (PoiDTO poi : filtered) {
            if (poi.getPoiId().equals(startPoiId)) continue;
            if (poi.getCrowdedness() >= 4) continue; // 跳过极度拥挤景点

            int stayMin = poi.getAvgStayMin() != null ? poi.getAvgStayMin() : 30;
            int estimated = stayMin * paceMultiplier + 10; // 10分钟交通时间

            if (totalTime + estimated > maxTime) break;

            poiSequence.add(poi.getPoiId());
            selectedPois.add(poi);
            totalTime += estimated;
        }

        // 6. 生成出行提示
        List<String> tips = generateTips(selectedPois, prefs);

        String routeId = "route_" + UUID.randomUUID().toString().substring(0, 8);

        return RouteResponseDTO.builder()
                .routeId(routeId)
                .poiSequence(poiSequence)
                .poiDetails(selectedPois)
                .estimatedTimeMin(totalTime)
                .tips(tips)
                .build();
    }

    private List<PoiDTO> filterByInterest(List<PoiDTO> pois, String interest) {
        if (interest == null || "全部".equals(interest)) {
            return new ArrayList<>(pois);
        }
        return pois.stream()
                .filter(p -> interest.equals(p.getCategory()))
                .collect(Collectors.toList());
    }

    private int getPaceMultiplier(String pace) {
        return switch (pace != null ? pace : "normal") {
            case "relaxed" -> 2;     // 悠闲模式，停留时间翻倍
            case "hurried" -> 1;     // 紧凑模式
            default -> 1;            // 适中模式
        };
    }

    private List<String> generateTips(List<PoiDTO> pois, RouteRequestDTO.Preferences prefs) {
        List<String> tips = new ArrayList<>();

        // 拥挤提示
        List<PoiDTO> crowded = pois.stream()
                .filter(p -> p.getCrowdedness() >= 3)
                .collect(Collectors.toList());
        if (!crowded.isEmpty()) {
            String names = crowded.stream().map(PoiDTO::getName).collect(Collectors.joining("、"));
            tips.add("当前" + names + "人流较多，建议错峰前往");
        }

        // 同行人提示
        if (prefs.getCompanions() != null) {
            switch (prefs.getCompanions()) {
                case "with_children" -> tips.add("携带儿童建议选择平缓路线，注意防晒补水");
                case "with_elderly" -> tips.add("同行有长者，建议放慢节奏，多安排休息点");
                case "group" -> tips.add("团队游览建议提前预约讲解服务");
            }
        }

        // 节奏提示
        if ("relaxed".equals(prefs.getPace())) {
            tips.add("悠闲模式已开启，建议在每个景点充分停留欣赏");
        }

        return tips;
    }
}
