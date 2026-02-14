package com.codeclimb.backend.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class DashboardDtos {
    public record CategoryStats(String category, long solvedCount, Double avgTimeMinutes) {}
    public record ProgressItem(Integer neet250Id, Integer orderIndex, String title, String category) {}

    public record DashboardResponse(UUID latestListId, OffsetDateTime lastActivityAt, int streakCurrent,
                                    String farthestCategory, Integer farthestOrderIndex,
                                    ProgressItem farthestSolved,
                                    List<ProgressItem> latestSolved,
                                    List<ProgressItem> nextUnsolved,
                                    List<CategoryStats> perCategory) {}
}
