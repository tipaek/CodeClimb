package com.codeclimb.backend.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public class AttemptDtos {
    public record UpsertAttemptRequest(Boolean solved, LocalDate dateSolved, Integer timeMinutes, Integer attempts,
                                       String confidence, String timeComplexity, String spaceComplexity,
                                       String notes, String problemUrl) {}
    public record AttemptResponse(UUID id, UUID listId, Integer neet250Id, Boolean solved, LocalDate dateSolved,
                                  Integer timeMinutes, Integer attempts, String confidence, String timeComplexity,
                                  String spaceComplexity, String notes, String problemUrl, OffsetDateTime updatedAt) {}
}
