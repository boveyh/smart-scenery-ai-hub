package com.smartscenery.controller;

import com.smartscenery.dto.ApiResult;
import com.smartscenery.dto.PoiDTO;
import com.smartscenery.service.PoiService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * POI 景点接口 — 对应 API 文档 §4.1
 */
@RestController
@RequestMapping({"/api/v1", "/api"})
public class PoiController {

    @Autowired
    private PoiService poiService;

    /**
     * 获取景点 POI 列表
     * GET /api/v1/pois?lat=30.232&lng=120.146
     */
    @GetMapping("/pois")
    public ApiResult<List<PoiDTO>> getPois(
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng) {
        List<PoiDTO> pois = poiService.getPoiList(lat, lng);
        return ApiResult.success(pois);
    }

    /**
     * 根据分类查询景点
     * GET /api/v1/pois?category=历史文化
     */
    @GetMapping("/pois/category/{category}")
    public ApiResult<List<PoiDTO>> getPoisByCategory(@PathVariable String category) {
        List<PoiDTO> pois = poiService.getPoisByCategory(category);
        return ApiResult.success(pois);
    }

    /**
     * 获取单个景点详情
     * GET /api/v1/pois/{poiId}
     */
    @GetMapping("/pois/{poiId}")
    public ApiResult<PoiDTO> getPoiById(@PathVariable String poiId) {
        PoiDTO poi = poiService.getPoiById(poiId);
        return ApiResult.success(poi);
    }
}
