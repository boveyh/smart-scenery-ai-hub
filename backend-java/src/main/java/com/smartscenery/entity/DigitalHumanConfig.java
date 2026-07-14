package com.smartscenery.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "t_digital_human_config", uniqueConstraints = {
        @UniqueConstraint(columnNames = "tenantId")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DigitalHumanConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 64)
    private String tenantId;

    @Column(length = 64)
    private String personaName;

    @Column(length = 64)
    private String ttsVoice;

    @Column(length = 16)
    private String ttsRate;

    @Column(length = 16)
    private String ttsPitch;

    @Column(length = 512)
    private String faceImage;

    @Column(length = 512)
    private String backgroundImage;

    @Column(columnDefinition = "TEXT")
    private String personaPrompt;

    @Column(length = 64)
    private String live2dModel;

    @Column(length = 64)
    private String costume;

    @Builder.Default
    private Boolean enabled = true;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
