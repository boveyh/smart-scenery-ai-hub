package com.smartscenery.controller;

import com.smartscenery.dto.ApiResult;
import com.smartscenery.entity.PoiCrowdedness;
import com.smartscenery.service.PoiCrowdednessService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 拥挤度接口 — 记录与查询景点实时拥挤度
 */
@RestController
@RequestMapping("/api/v1/crowdedness")
public class PoiCrowdednessController {

    @Autowired
    private PoiCrowdednessService crowdednessService;

    /**
     * 记录拥挤度
     * POST /api/v1/crowdedness/record
     */
    @PostMapping("/record")
    public ApiResult<PoiCrowdedness> recordCrowdedness(
            @RequestParam String poiId,
            @RequestParam Integer crowdedness,
            @RequestParam(required = false, defaultValue = "manual") String source) {
        return ApiResult.success(crowdednessService.recordCrowdedness(poiId, crowdedness, source));
    }

    /**
     * 查询历史拥挤度
     * GET /api/v1/crowdedness/history/{poiId}?hours=24
     */
    @GetMapping("/history/{poiId}")
    public ApiResult<List<PoiCrowdedness>> getHistory(
            @PathVariable String poiId,
            @RequestParam(defaultValue = "24") int hours) {
        return ApiResult.success(crowdednessService.getHistory(poiId, hours));
    }

    /**
     * 获取最新拥挤度
     * GET /api/v1/crowdedness/latest/{poiId}
     */
    @GetMapping("/latest/{poiId}")
    public ApiResult<PoiCrowdedness> getLatest(@PathVariable String poiId) {
        return ApiResult.success(crowdednessService.getLatest(poiId));
    }
}
