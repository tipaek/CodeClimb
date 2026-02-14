package com.codeclimb.backend.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public class DashboardDtos {
    public record ProgressItem(Integer neet250Id, Integer orderIndex, String title, String category) {}
    public record CategorySolvedStats(String category, long solvedCount, long totalInCategory,
                                      long easySolved, long mediumSolved, long hardSolved) {}
    public record SolvedCounts(long totalSolved, List<CategorySolvedStats> byCategory) {}
    public record CategoryAvgTime(String category, Double avgTimeMinutes) {}
    public record TimeAverages(Double overallAvgTimeMinutes, List<CategoryAvgTime> byCategoryAvgTimeMinutes) {}
    public record RightPanel(List<ProgressItem> latestSolved, List<ProgressItem> nextUnsolved) {}

    public record DashboardResponse(String scope, UUID latestListId, UUID listId, OffsetDateTime lastActivityAt,
                                    int streakCurrent, double streakAverage, String farthestCategory,
                                    Integer farthestOrderIndex, ProgressItem farthestProblem,
                                    SolvedCounts solvedCounts, TimeAverages timeAverages,
                                    RightPanel rightPanel) {}
}
