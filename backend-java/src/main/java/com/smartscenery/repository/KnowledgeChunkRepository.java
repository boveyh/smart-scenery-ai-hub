package com.smartscenery.repository;

import com.smartscenery.entity.KnowledgeChunk;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnowledgeChunkRepository extends JpaRepository<KnowledgeChunk, Long> {

    List<KnowledgeChunk> findByTenantIdAndEnabledTrue(String tenantId);

    List<KnowledgeChunk> findByTenantIdAndPoiId(String tenantId, String poiId);

    /** MySQL 全文检索 */
    @Query(value = """
            SELECT * FROM t_knowledge_chunk
            WHERE tenant_id = :tenantId AND enabled = true
              AND MATCH(content) AGAINST(:keyword IN BOOLEAN MODE)
            ORDER BY chunk_order ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<KnowledgeChunk> fullTextSearch(@Param("tenantId") String tenantId,
                                        @Param("keyword") String keyword,
                                        @Param("limit") int limit);

    /** 标签模糊匹配检索 */
    @Query(value = """
            SELECT * FROM t_knowledge_chunk
            WHERE tenant_id = :tenantId AND enabled = true
              AND (content LIKE CONCAT('%', :keyword, '%')
                   OR tags LIKE CONCAT('%', :keyword, '%')
                   OR title LIKE CONCAT('%', :keyword, '%'))
            ORDER BY chunk_order ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<KnowledgeChunk> keywordSearch(@Param("tenantId") String tenantId,
                                       @Param("keyword") String keyword,
                                       @Param("limit") int limit);
}
