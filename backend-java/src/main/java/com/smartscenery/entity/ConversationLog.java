package com.smartscenery.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "t_conversation_log", indexes = {
        @Index(name = "idx_conv_tenant", columnList = "tenantId"),
        @Index(name = "idx_conv_session", columnList = "sessionId"),
        @Index(name = "idx_conv_created", columnList = "createdAt"),
        @Index(name = "idx_conv_sentiment", columnList = "tenantId, sentiment")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String tenantId;

    @Column(nullable = false, length = 64)
    private String sessionId;

    @Column(nullable = false, length = 16)
    private String mode;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String userContent;

    @Column(columnDefinition = "TEXT")
    private String aiContent;

    @Column(length = 32)
    private String userIntent;

    @Column(length = 16)
    private String sentiment;

    private Double sentimentScore;

    @Column(length = 64)
    private String topicTag;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
