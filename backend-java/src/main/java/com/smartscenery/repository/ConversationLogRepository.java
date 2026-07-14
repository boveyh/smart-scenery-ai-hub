package com.smartscenery.repository;

import com.smartscenery.entity.ConversationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ConversationLogRepository extends JpaRepository<ConversationLog, Long> {

    List<ConversationLog> findByTenantIdOrderByCreatedAtDesc(String tenantId);

    List<ConversationLog> findByTenantIdAndCreatedAtBetween(String tenantId, LocalDateTime start, LocalDateTime end);

    long countByTenantIdAndCreatedAtBetween(String tenantId, LocalDateTime start, LocalDateTime end);

    @Query(value = """
            SELECT sentiment, COUNT(*) as cnt
            FROM t_conversation_log
            WHERE tenant_id = :tenantId AND sentiment IS NOT NULL
              AND created_at >= :since
            GROUP BY sentiment
            ORDER BY cnt DESC
            """, nativeQuery = true)
    List<Object[]> aggregateSentiment(@Param("tenantId") String tenantId, @Param("since") LocalDateTime since);

    @Query(value = """
            SELECT topic_tag, COUNT(*) as cnt
            FROM t_conversation_log
            WHERE tenant_id = :tenantId AND topic_tag IS NOT NULL
              AND created_at >= :since
            GROUP BY topic_tag
            ORDER BY cnt DESC
            LIMIT 20
            """, nativeQuery = true)
    List<Object[]> aggregateTopics(@Param("tenantId") String tenantId, @Param("since") LocalDateTime since);

    @Query(value = """
            SELECT DATE(created_at) as dt, COUNT(*) as cnt
            FROM t_conversation_log
            WHERE tenant_id = :tenantId
              AND created_at >= :since
            GROUP BY DATE(created_at)
            ORDER BY dt
            """, nativeQuery = true)
    List<Object[]> dailyConversationCount(@Param("tenantId") String tenantId, @Param("since") LocalDateTime since);
}
