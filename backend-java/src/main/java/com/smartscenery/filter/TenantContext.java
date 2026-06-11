package com.smartscenery.filter;

/**
 * 多租户上下文 — ThreadLocal 存储当前请求的 tenant_id
 */
public class TenantContext {

    private static final ThreadLocal<String> CURRENT_TENANT = new ThreadLocal<>();

    public static void setTenantId(String tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static String getTenantId() {
        String tenantId = CURRENT_TENANT.get();
        return tenantId != null ? tenantId : "default";
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
