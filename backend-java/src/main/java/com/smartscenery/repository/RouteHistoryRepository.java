package com.smartscenery.repository;

import com.smartscenery.entity.RouteHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RouteHistoryRepository extends JpaRepository<RouteHistory, Long> {

    List<RouteHistory> findByTenantIdOrderByCreatedAtDesc(String tenantId);

    List<RouteHistory> findByTouristIdOrderByCreatedAtDesc(String touristId);
}
