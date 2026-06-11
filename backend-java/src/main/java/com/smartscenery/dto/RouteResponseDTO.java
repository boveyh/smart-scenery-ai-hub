package com.smartscenery.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 路线推荐响应 DTO — 对齐 API 文档 §4.2
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RouteResponseDTO {

    private String routeId;
    private List<String> poiSequence;
    private List<PoiDTO> poiDetails;
    private Integer estimatedTimeMin;
    private List<String> tips;
}
