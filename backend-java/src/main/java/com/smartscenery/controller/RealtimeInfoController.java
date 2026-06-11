package com.smartscenery.controller;

import com.smartscenery.dto.ApiResult;
import com.smartscenery.dto.RealtimeInfoDTO;
import com.smartscenery.service.RealtimeInfoService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 景区实时资讯接口 — 对应 API 文档 §4.4
 */
@RestController
@RequestMapping("/api/v1/info")
public class RealtimeInfoController {

    @Autowired
    private RealtimeInfoService realtimeInfoService;

    /**
     * 景区实时资讯（天气/人流/公告）
     * GET /api/v1/info/realtime
     */
    @GetMapping("/realtime")
    public ApiResult<RealtimeInfoDTO> getRealtimeInfo() {
        RealtimeInfoDTO info = realtimeInfoService.getRealtimeInfo();
        return ApiResult.success(info);
    }
}
