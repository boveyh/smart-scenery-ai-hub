package com.smartscenery.repository;

import com.smartscenery.entity.DigitalHumanConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DigitalHumanConfigRepository extends JpaRepository<DigitalHumanConfig, Long> {
    Optional<DigitalHumanConfig> findByTenantId(String tenantId);
    List<DigitalHumanConfig> findByEnabledTrue();
}
