package com.smartscenery.dto;

import com.smartscenery.entity.Poi;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * POI 景点响应 DTO — 对齐 API 文档 §4.1
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PoiDTO {

    private String poiId;
    private String name;
    private String category;
    private String subCategory;
    private BigDecimal lat;
    private BigDecimal lng;
    private String address;
    private String description;
    private Integer avgStayMin;
    private String openingHours;
    private BigDecimal ticketPrice;
    private String imageUrl;
    private Integer crowdedness;
    /** 距离（米），仅按距离排序时返回 */
    private Double distance;

    public static PoiDTO fromEntity(Poi poi) {
        return PoiDTO.builder()
                .poiId(poi.getPoiId())
                .name(poi.getName())
                .category(poi.getCategory())
                .subCategory(poi.getSubCategory())
                .lat(poi.getLat())
                .lng(poi.getLng())
                .address(poi.getAddress())
                .description(poi.getDescription())
                .avgStayMin(poi.getAvgStayMin())
                .openingHours(poi.getOpeningHours())
                .ticketPrice(poi.getTicketPrice())
                .imageUrl(poi.getImageUrl())
                .crowdedness(poi.getCrowdedness())
                .build();
    }

    public static PoiDTO fromEntityWithDistance(Poi poi, Double distance) {
        PoiDTO dto = fromEntity(poi);
        dto.setDistance(Math.round(distance * 10.0) / 10.0);
        return dto;
    }
}
