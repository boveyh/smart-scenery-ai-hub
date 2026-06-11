package com.smartscenery.repository;

import com.smartscenery.entity.RealtimeInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RealtimeInfoRepository extends JpaRepository<RealtimeInfo, Long> {

    Optional<RealtimeInfo> findByTenantId(String tenantId);
}
