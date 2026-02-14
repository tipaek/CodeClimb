package com.codeclimb.backend.service;

import com.codeclimb.backend.dto.DashboardDtos;
import com.codeclimb.backend.entity.ListEntity;
import com.codeclimb.backend.repository.AttemptEntryRepository;
import com.codeclimb.backend.repository.ListRepository;
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
    private final ListRepository listRepository;
    private final EntityManager entityManager;

    public DashboardService(AttemptEntryRepository attemptEntryRepository, ListRepository listRepository, EntityManager entityManager) {
        this.attemptEntryRepository = attemptEntryRepository;
        this.listRepository = listRepository;
        this.entityManager = entityManager;
    }

    public DashboardDtos.DashboardResponse getDashboard(UUID userId) {
        UUID latestListId = attemptEntryRepository.findLatestListForUser(userId).map(UUID::fromString).orElse(null);
        if (latestListId == null) {
            return new DashboardDtos.DashboardResponse(null, null, 0, null, null, null, List.of(), List.of(), List.of());
        }
        ListEntity list = listRepository.findByIdAndUserId(latestListId, userId).orElseThrow(() -> new BadRequestException("List not found"));
        OffsetDateTime lastActivityAt = toOffsetDateTime(attemptEntryRepository.findLastActivityAt(userId, latestListId));

        List<?> farthestRows = entityManager.createNativeQuery("""
            with latest_per_problem as (
              select x.neet250_id, x.solved
              from (
                select ae.neet250_id, ae.solved,
                       row_number() over (partition by ae.neet250_id order by ae.updated_at desc) as rn
                from attempt_entries ae
                where ae.user_id = :userId and ae.list_id = :listId
              ) x
              where x.rn = 1
            )
            select p.neet250_id, p.order_index, p.title, p.category
            from latest_per_problem lpp
            join problems p on p.neet250_id = lpp.neet250_id and p.template_version = :templateVersion
            where lpp.solved = true
            order by p.order_index desc
            limit 1
            """).setParameter("userId", userId).setParameter("listId", latestListId).setParameter("templateVersion", list.getTemplateVersion()).getResultList();

        DashboardDtos.ProgressItem farthestSolved = null;
        Integer farthestOrder = null;
        String farthestCategory = null;
        if (!farthestRows.isEmpty()) {
            Object[] row = (Object[]) farthestRows.get(0);
            farthestSolved = toProgress(row);
            farthestOrder = farthestSolved.orderIndex();
            farthestCategory = farthestSolved.category();
        }

        List<DashboardDtos.ProgressItem> latestSolved = toProgressList(entityManager.createNativeQuery("""
            with latest_per_problem as (
              select x.neet250_id, x.solved
              from (
                select ae.neet250_id, ae.solved,
                       row_number() over (partition by ae.neet250_id order by ae.updated_at desc) as rn
                from attempt_entries ae
                where ae.user_id = :userId and ae.list_id = :listId
              ) x
              where x.rn = 1
            )
            select p.neet250_id, p.order_index, p.title, p.category
            from latest_per_problem lpp
            join problems p on p.neet250_id = lpp.neet250_id and p.template_version = :templateVersion
            where lpp.solved = true
            order by p.order_index desc
            limit 2
            """).setParameter("userId", userId).setParameter("listId", latestListId).setParameter("templateVersion", list.getTemplateVersion()).getResultList());

        List<DashboardDtos.ProgressItem> nextUnsolved = toProgressList(entityManager.createNativeQuery("""
            with latest_per_problem as (
              select x.neet250_id, x.solved
              from (
                select ae.neet250_id, ae.solved,
                       row_number() over (partition by ae.neet250_id order by ae.updated_at desc) as rn
                from attempt_entries ae
                where ae.user_id = :userId and ae.list_id = :listId
              ) x
              where x.rn = 1
            )
            select p.neet250_id, p.order_index, p.title, p.category
            from problems p
            left join latest_per_problem lpp on lpp.neet250_id = p.neet250_id
            where p.template_version = :templateVersion
              and p.order_index > :farthestOrder
              and coalesce(lpp.solved, false) = false
            order by p.order_index asc
            limit 4
            """).setParameter("userId", userId).setParameter("listId", latestListId).setParameter("templateVersion", list.getTemplateVersion())
                .setParameter("farthestOrder", farthestOrder == null ? 0 : farthestOrder).getResultList());

        List<?> categoryRows = entityManager.createNativeQuery("""
            select p.category, count(*), avg(a.time_minutes)
            from attempt_entries a
            join problems p on p.neet250_id = a.neet250_id and p.template_version = :templateVersion
            where a.user_id = :userId and a.list_id = :listId and a.solved = true
            group by p.category
            order by p.category
            """).setParameter("userId", userId).setParameter("listId", latestListId).setParameter("templateVersion", list.getTemplateVersion()).getResultList();
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

        return new DashboardDtos.DashboardResponse(latestListId, lastActivityAt, streak, farthestCategory, farthestOrder,
                farthestSolved, latestSolved, nextUnsolved, stats);
    }

    private List<DashboardDtos.ProgressItem> toProgressList(List<?> rows) {
        List<DashboardDtos.ProgressItem> items = new ArrayList<>();
        for (Object rowObj : rows) {
            items.add(toProgress((Object[]) rowObj));
        }
        return items;
    }

    private DashboardDtos.ProgressItem toProgress(Object[] row) {
        return new DashboardDtos.ProgressItem(((Number) row[0]).intValue(), ((Number) row[1]).intValue(), (String) row[2], (String) row[3]);
    }

    private OffsetDateTime toOffsetDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime odt) {
            return odt;
        }
        if (value instanceof java.time.LocalDateTime ldt) {
            return ldt.atOffset(ZoneOffset.UTC);
        }
        if (value instanceof java.time.Instant instant) {
            return instant.atOffset(ZoneOffset.UTC);
        }
        return ((Timestamp) value).toInstant().atOffset(ZoneOffset.UTC);
    }
}
