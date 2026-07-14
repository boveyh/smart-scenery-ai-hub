package com.smartscenery.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonitorMetricsDTO {
    private double cpuUsage;
    private long memoryUsageMb;
    private int activeSessions;
    private int digitalhumanSessions;
    private long totalConversations;
    private long todayConversations;
    private double avgResponseTime;
}
