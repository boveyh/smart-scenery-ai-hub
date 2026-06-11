package com.smartscenery.controller;

import com.smartscenery.dto.ApiResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 拍照识物接口 — 对应 API 文档 §4.3
 *
 * 注意：当前为 Mock 实现，实际需对接 AI 多模态视觉服务
 */
@RestController
@RequestMapping("/api/v1/vision")
public class VisionController {

    /**
     * 拍照识物（多模态视觉问答）
     * POST /api/v1/vision/recognize
     * Content-Type: multipart/form-data
     */
    @PostMapping("/recognize")
    public ApiResult<Map<String, Object>> recognize(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "question", required = false) String question) {

        // Mock 返回示例数据
        Map<String, Object> data = new HashMap<>();
        data.put("object", "荷花");
        data.put("confidence", 0.96);
        data.put("description",
                "荷花是中国传统名花，出淤泥而不染，濯清涟而不妖。" +
                "荷花在景区内主要分布在西湖十景之一的"曲院风荷"，" +
                "夏季 6-8 月为最佳观赏期。");

        return ApiResult.success(data);
    }
}
