package com.smartscenery.repository;

import com.smartscenery.entity.OfflineKnowledge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OfflineKnowledgeRepository extends JpaRepository<OfflineKnowledge, Long> {

    List<OfflineKnowledge> findByTenantId(String tenantId);
}
