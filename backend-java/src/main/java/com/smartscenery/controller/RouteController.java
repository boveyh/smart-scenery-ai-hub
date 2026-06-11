package com.smartscenery.controller;

import com.smartscenery.dto.ApiResult;
import com.smartscenery.dto.RouteRequestDTO;
import com.smartscenery.dto.RouteResponseDTO;
import com.smartscenery.service.RouteService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 路线推荐接口 — 对应 API 文档 §4.2
 */
@RestController
@RequestMapping("/api/v1/route")
public class RouteController {

    @Autowired
    private RouteService routeService;

    /**
     * 个性化游览路线推荐（错峰调度）
     * POST /api/v1/route/recommend
     */
    @PostMapping("/recommend")
    public ApiResult<RouteResponseDTO> recommendRoute(@Valid @RequestBody RouteRequestDTO request) {
        RouteResponseDTO route = routeService.recommendRoute(request);
        return ApiResult.success(route);
    }
}
