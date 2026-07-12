package com.smartscenery.controller;

import com.smartscenery.dto.ApiResult;
import com.smartscenery.entity.Tenant;
import com.smartscenery.repository.TenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/tenants")
public class AdminTenantController {

    @Autowired private TenantRepository tenantRepository;

    @GetMapping
    public ApiResult<List<Tenant>> listTenants() {
        return ApiResult.success(tenantRepository.findAll());
    }

    @GetMapping("/{tenantId}")
    public ApiResult<Tenant> getTenant(@PathVariable String tenantId) {
        return ApiResult.success(tenantRepository.findByTenantId(tenantId).orElse(null));
    }

    @PutMapping("/{tenantId}")
    public ApiResult<Tenant> updateTenant(@PathVariable String tenantId, @RequestBody Tenant updated) {
        Tenant tenant = tenantRepository.findByTenantId(tenantId).orElse(null);
        if (tenant == null) return ApiResult.badRequest("租户不存在");
        if (updated.getName() != null) tenant.setName(updated.getName());
        if (updated.getDescription() != null) tenant.setDescription(updated.getDescription());
        if (updated.getProvince() != null) tenant.setProvince(updated.getProvince());
        if (updated.getCity() != null) tenant.setCity(updated.getCity());
        if (updated.getStatus() != null) tenant.setStatus(updated.getStatus());
        return ApiResult.success(tenantRepository.save(tenant));
    }
}
