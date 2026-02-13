package com.codeclimb.backend.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public class ProblemDtos {
    public record ProblemWithLatestAttemptResponse(Integer neet250Id, String title, String category, Integer orderIndex,
                                                   Boolean solved, LocalDate dateSolved, Integer timeMinutes,
                                                   String notes, String codeUrl, OffsetDateTime attemptUpdatedAt) {}
}
