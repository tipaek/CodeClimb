package com.codeclimb.backend.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public class AttemptDtos {
    public record UpsertAttemptRequest(Boolean solved, LocalDate dateSolved, Integer timeMinutes, String notes, String problemUrl) {}
    public record AttemptResponse(UUID id, UUID listId, Integer neet250Id, Boolean solved, LocalDate dateSolved,
                                  Integer timeMinutes, String notes, String problemUrl, OffsetDateTime updatedAt) {}
}
