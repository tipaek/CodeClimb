package com.codeclimb.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "attempt_entries")
@Getter
@Setter
public class AttemptEntryEntity {

    public enum ConfidenceLevel {
        LOW,
        MEDIUM,
        HIGH
    }

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "list_id", nullable = false)
    private UUID listId;

    @Column(name = "neet250_id", nullable = false)
    private Integer neet250Id;

    private Boolean solved;

    @Column(name = "date_solved")
    private LocalDate dateSolved;

    @Column(name = "time_minutes")
    private Integer timeMinutes;

    @Column(name = "attempts")
    private Integer attempts;

    @Column(name = "confidence")
    @Enumerated(EnumType.STRING)
    private ConfidenceLevel confidence;

    @Column(name = "time_complexity")
    private String timeComplexity;

    @Column(name = "space_complexity")
    private String spaceComplexity;

    private String notes;

    @Column(name = "problem_url")
    private String problemUrl;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @PrePersist
    void onCreate() {
        OffsetDateTime now = OffsetDateTime.now();
        if (id == null) {
            id = UUID.randomUUID();
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
