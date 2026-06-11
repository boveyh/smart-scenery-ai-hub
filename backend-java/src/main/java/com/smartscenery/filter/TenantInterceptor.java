package com.smartscenery.filter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 多租户拦截器 — 从请求头 X-Tenant-Id 提取租户ID，注入 ThreadLocal
 * 对应 API 文档 §1.5 多租户携带规则
 */
@Slf4j
@Component
public class TenantInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String tenantId = request.getHeader("X-Tenant-Id");
        if (tenantId == null || tenantId.isBlank()) {
            tenantId = "default";
        }
        TenantContext.setTenantId(tenantId);

        // 健康检查等接口不打印日志
        if (!request.getRequestURI().contains("/health")) {
            log.debug("租户上下文: tenant_id={}, uri={}", tenantId, request.getRequestURI());
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        TenantContext.clear();
    }
}
