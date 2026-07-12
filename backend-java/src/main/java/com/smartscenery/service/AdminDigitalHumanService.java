package com.smartscenery.service;

import com.smartscenery.entity.DigitalHumanConfig;
import com.smartscenery.exception.BusinessException;
import com.smartscenery.repository.DigitalHumanConfigRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
public class AdminDigitalHumanService {

    @Autowired private DigitalHumanConfigRepository configRepository;

    public List<DigitalHumanConfig> getAllConfigs() {
        return configRepository.findAll();
    }

    public DigitalHumanConfig getConfig(String tenantId) {
        return configRepository.findByTenantId(tenantId)
                .orElseThrow(() -> BusinessException.notFound("数字人配置不存在: " + tenantId));
    }

    @Transactional
    public DigitalHumanConfig saveConfig(DigitalHumanConfig config) {
        if (config.getId() != null) {
            DigitalHumanConfig existing = configRepository.findById(config.getId())
                    .orElseThrow(() -> BusinessException.notFound("配置不存在"));
            if (config.getPersonaName() != null) existing.setPersonaName(config.getPersonaName());
            if (config.getTtsVoice() != null) existing.setTtsVoice(config.getTtsVoice());
            if (config.getTtsRate() != null) existing.setTtsRate(config.getTtsRate());
            if (config.getTtsPitch() != null) existing.setTtsPitch(config.getTtsPitch());
            if (config.getFaceImage() != null) existing.setFaceImage(config.getFaceImage());
            if (config.getBackgroundImage() != null) existing.setBackgroundImage(config.getBackgroundImage());
            if (config.getPersonaPrompt() != null) existing.setPersonaPrompt(config.getPersonaPrompt());
            if (config.getLive2dModel() != null) existing.setLive2dModel(config.getLive2dModel());
            if (config.getCostume() != null) existing.setCostume(config.getCostume());
            if (config.getEnabled() != null) existing.setEnabled(config.getEnabled());
            return configRepository.save(existing);
        }
        return configRepository.save(config);
    }

    @Transactional
    public void deleteConfig(Long id) {
        DigitalHumanConfig config = configRepository.findById(id)
                .orElseThrow(() -> BusinessException.notFound("配置不存在"));
        config.setEnabled(false);
        configRepository.save(config);
    }
}
