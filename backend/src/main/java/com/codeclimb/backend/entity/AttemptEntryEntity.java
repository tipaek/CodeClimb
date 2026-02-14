package com.codeclimb.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

    @Id
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "list_id", nullable = false)
    private UUID listId;

    @Column(name = "neet250_id", nullable = false)
    private Integer neet250Id;

    @Column(name = "template_version", nullable = false)
    private String templateVersion;

    private Boolean solved;

    @Column(name = "date_solved")
    private LocalDate dateSolved;

    @Column(name = "time_minutes")
    private Integer timeMinutes;

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
