package com.codeclimb.backend.service;

import com.codeclimb.backend.dto.DashboardDtos;
import com.codeclimb.backend.repository.AttemptEntryRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class DashboardService {

    private final AttemptEntryRepository attemptEntryRepository;
    private final EntityManager entityManager;

    public DashboardService(AttemptEntryRepository attemptEntryRepository, EntityManager entityManager) {
        this.attemptEntryRepository = attemptEntryRepository;
        this.entityManager = entityManager;
    }

    public DashboardDtos.DashboardResponse getDashboard(UUID userId) {
        UUID latestListId = attemptEntryRepository.findLatestListForUser(userId).orElse(null);
        if (latestListId == null) {
            return new DashboardDtos.DashboardResponse(null, null, 0, null, null, List.of());
        }
        OffsetDateTime lastActivityAt = toOffsetDateTime(attemptEntryRepository.findLastActivityAt(userId, latestListId));

        String farthestCategory = null;
        Integer farthestOrder = null;
        List<?> farthestRows = entityManager.createNativeQuery("""
            select p.category, p.order_index
            from attempt_entries a
            join problems p on p.neet250_id = a.neet250_id
            where a.user_id = :userId and a.list_id = :listId and a.solved = true
            order by p.order_index desc
            limit 1
            """).setParameter("userId", userId).setParameter("listId", latestListId).getResultList();
        if (!farthestRows.isEmpty()) {
            Object[] row = (Object[]) farthestRows.get(0);
            farthestCategory = (String) row[0];
            farthestOrder = (Integer) row[1];
        }

        List<?> categoryRows = entityManager.createNativeQuery("""
            select p.category, count(*), avg(a.time_minutes)
            from attempt_entries a
            join problems p on p.neet250_id = a.neet250_id
            where a.user_id = :userId and a.list_id = :listId and a.solved = true
            group by p.category
            order by p.category
            """).setParameter("userId", userId).setParameter("listId", latestListId).getResultList();
        List<DashboardDtos.CategoryStats> stats = new ArrayList<>();
        for (Object rowObj : categoryRows) {
            Object[] row = (Object[]) rowObj;
            stats.add(new DashboardDtos.CategoryStats((String) row[0], ((Number) row[1]).longValue(),
                    row[2] == null ? null : ((Number) row[2]).doubleValue()));
        }

        List<?> solvedDateRows = entityManager.createNativeQuery("""
            select distinct date_solved
            from attempt_entries
            where user_id = :userId and date_solved is not null and solved = true
            order by date_solved desc
            """).setParameter("userId", userId).getResultList();
        Set<LocalDate> solvedDates = new HashSet<>();
        for (Object row : solvedDateRows) {
            solvedDates.add(((Date) row).toLocalDate());
        }
        int streak = 0;
        LocalDate cursor = LocalDate.now();
        while (solvedDates.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }

        return new DashboardDtos.DashboardResponse(latestListId, lastActivityAt, streak, farthestCategory, farthestOrder, stats);
    }

    private OffsetDateTime toOffsetDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime odt) {
            return odt;
        }
        return ((Timestamp) value).toInstant().atOffset(ZoneOffset.UTC);
    }
}
