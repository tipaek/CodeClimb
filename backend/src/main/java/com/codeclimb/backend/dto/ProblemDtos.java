package com.codeclimb.backend.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

public class ProblemDtos {

    public record LatestAttempt(Boolean solved, LocalDate dateSolved, Integer timeMinutes,
                                String notes, String problemUrl, OffsetDateTime updatedAt) {}

    public record ProblemWithLatestAttemptResponse(Integer neet250Id, Integer orderIndex, String title,
                                                   String leetcodeSlug, String category, String difficulty,
                                                   LatestAttempt latestAttempt) {}
}
