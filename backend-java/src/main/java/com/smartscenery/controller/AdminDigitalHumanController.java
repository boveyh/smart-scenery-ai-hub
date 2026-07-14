package com.smartscenery.controller;

import com.smartscenery.dto.ApiResult;
import com.smartscenery.entity.DigitalHumanConfig;
import com.smartscenery.service.AdminDigitalHumanService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/digital-human")
public class AdminDigitalHumanController {

    @Autowired private AdminDigitalHumanService service;

    @GetMapping
    public ApiResult<List<DigitalHumanConfig>> listConfigs() {
        return ApiResult.success(service.getAllConfigs());
    }

    @GetMapping("/{tenantId}")
    public ApiResult<DigitalHumanConfig> getConfig(@PathVariable String tenantId) {
        return ApiResult.success(service.getConfig(tenantId));
    }

    @PostMapping
    public ApiResult<DigitalHumanConfig> saveConfig(@RequestBody DigitalHumanConfig config) {
        return ApiResult.success(service.saveConfig(config));
    }

    @DeleteMapping("/{id}")
    public ApiResult<Void> deleteConfig(@PathVariable Long id) {
        service.deleteConfig(id);
        return ApiResult.success();
    }
}
