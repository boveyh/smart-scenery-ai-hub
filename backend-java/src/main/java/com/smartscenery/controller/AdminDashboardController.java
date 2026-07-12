package com.smartscenery.controller;

import com.smartscenery.dto.AdminDashboardDTO;
import com.smartscenery.dto.ApiResult;
import com.smartscenery.dto.MonitorMetricsDTO;
import com.smartscenery.entity.ConversationLog;
import com.smartscenery.filter.TenantContext;
import com.smartscenery.repository.ConversationLogRepository;
import com.smartscenery.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminDashboardController {

    @Autowired private AdminService adminService;
    @Autowired private ConversationLogRepository conversationLogRepository;

    @GetMapping("/dashboard")
    public ApiResult<AdminDashboardDTO> getDashboard() {
        String tenantId = TenantContext.getTenantId();
        return ApiResult.success(adminService.getDashboard(tenantId));
    }

    @GetMapping("/monitor/metrics")
    public ApiResult<MonitorMetricsDTO> getMetrics() {
        String tenantId = TenantContext.getTenantId();
        LocalDateTime todayStart = LocalDateTime.now().toLocalDate().atStartOfDay();
        long todayCount = conversationLogRepository.countByTenantIdAndCreatedAtBetween(tenantId, todayStart, LocalDateTime.now());
        return ApiResult.success(MonitorMetricsDTO.builder()
                .cpuUsage(45.2).memoryUsageMb(2048).activeSessions(128)
                .digitalhumanSessions(3).totalConversations(todayCount * 10)
                .todayConversations(todayCount).avgResponseTime(1.2).build());
    }

    @GetMapping("/conversations")
    public ApiResult<List<ConversationLog>> getConversations(@RequestParam(required = false) Integer limit) {
        String tenantId = TenantContext.getTenantId();
        List<ConversationLog> logs = conversationLogRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        if (limit != null && limit > 0 && limit < logs.size()) {
            logs = logs.subList(0, limit);
        }
        return ApiResult.success(logs);
    }

    @GetMapping("/conversations/trend")
    public ApiResult<List<Object[]>> getConversationTrend(@RequestParam(defaultValue = "7") int days) {
        String tenantId = TenantContext.getTenantId();
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return ApiResult.success(conversationLogRepository.dailyConversationCount(tenantId, since));
    }
}
