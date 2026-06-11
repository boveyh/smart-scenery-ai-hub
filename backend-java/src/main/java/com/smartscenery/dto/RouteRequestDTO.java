package com.smartscenery.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 路线推荐请求 DTO — 对齐 API 文档 §4.2
 */
@Data
public class RouteRequestDTO {

    /** 游客偏好 */
    private Preferences preferences;

    /** 起始 POI ID */
    @NotBlank(message = "起始景点不能为空")
    private String startPoiId;

    @Data
    public static class Preferences {
        /** 兴趣偏好：历史文化/自然风光/休闲娱乐/全部 */
        private String interest = "全部";

        /** 游览节奏：relaxed(悠闲)/normal(适中)/hurried(紧凑) */
        private String pace = "normal";

        /** 同行人：alone/solo/with_children/with_elderly/group */
        private String companions = "alone";

        /** 计划游览时长（分钟） */
        @Min(value = 30, message = "游览时长至少30分钟")
        private Integer durationMin = 180;
    }
}
