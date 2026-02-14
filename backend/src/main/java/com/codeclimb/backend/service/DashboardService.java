package com.codeclimb.backend.service;

import com.codeclimb.backend.dto.DashboardDtos;
import com.codeclimb.backend.entity.ListEntity;
import com.codeclimb.backend.entity.UserEntity;
import com.codeclimb.backend.repository.AttemptEntryRepository;
import com.codeclimb.backend.repository.ListRepository;
import com.codeclimb.backend.repository.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class DashboardService {

    private final AttemptEntryRepository attemptEntryRepository;
    private final ListRepository listRepository;
    private final UserRepository userRepository;
    private final EntityManager entityManager;

    public DashboardService(AttemptEntryRepository attemptEntryRepository,
                            ListRepository listRepository,
                            UserRepository userRepository,
                            EntityManager entityManager) {
        this.attemptEntryRepository = attemptEntryRepository;
        this.listRepository = listRepository;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
    }

    public DashboardDtos.DashboardResponse getDashboard(UUID userId, String scopeInput, UUID listId) {
        DashboardScope scope = DashboardScope.from(scopeInput);
        UUID latestListId = attemptEntryRepository.findLatestListForUser(userId).map(UUID::fromString).orElse(null);
        UUID scopedListId = null;
        if (scope == DashboardScope.LATEST) {
            scopedListId = latestListId;
        }
        if (scope == DashboardScope.LIST) {
            if (listId == null) {
                throw new BadRequestException("listId is required when scope=list");
            }
            scopedListId = listRepository.findByIdAndUserId(listId, userId)
                    .orElseThrow(() -> new BadRequestException("List not found")).getId();
        }

        ListEntity scopedList = scopedListId == null ? null : listRepository.findByIdAndUserId(scopedListId, userId)
                .orElseThrow(() -> new BadRequestException("List not found"));

        if (scope == DashboardScope.LATEST && scopedListId == null) {
            return new DashboardDtos.DashboardResponse(scope.value, null, null, null, 0, 0d,
                    null, null, null,
                    new DashboardDtos.SolvedCounts(0, List.of()),
                    new DashboardDtos.TimeAverages(null, List.of()),
                    new DashboardDtos.RightPanel(List.of(), List.of()));
        }

        String scopeCondition = scope == DashboardScope.ALL ? "" : " and ae.list_id = :scopedListId ";

        OffsetDateTime lastActivityAt = toOffsetDateTime(singleResult("""
            select max(ae.updated_at)
            from attempt_entries ae
            where ae.user_id = :userId
            """ + scopeCondition, userId, scopedListId));

        DashboardDtos.ProgressItem farthestProblem = toFirstProgress(query("""
            select p.neet250_id, p.order_index, p.title, p.category
            from problems p
            where exists (
                select 1
                from lists l
                where l.user_id = :userId
                  and l.template_version = p.template_version
                """ + (scope == DashboardScope.ALL ? "" : " and l.id = :scopedListId ") + """
                  and exists (
                    select 1
                    from attempt_entries ae
                    where ae.user_id = :userId
                      and ae.list_id = l.id
                      and ae.neet250_id = p.neet250_id
                      and ae.solved = true
                  )
              )
            order by p.order_index desc
            limit 1
            """, userId, scopedListId));

        Integer farthestOrder = farthestProblem == null ? null : farthestProblem.orderIndex();
        String farthestCategory = farthestProblem == null ? null : farthestProblem.category();

        List<DashboardDtos.ProgressItem> latestSolved = toProgressList(query("""
            select p.neet250_id, p.order_index, p.title, p.category
            from problems p
            where exists (
                select 1
                from lists l
                where l.user_id = :userId
                  and l.template_version = p.template_version
                """ + (scope == DashboardScope.ALL ? "" : " and l.id = :scopedListId ") + """
                  and exists (
                    select 1
                    from attempt_entries ae
                    where ae.user_id = :userId
                      and ae.list_id = l.id
                      and ae.neet250_id = p.neet250_id
                      and ae.solved = true
                  )
              )
            order by p.order_index desc
            limit 2
            """, userId, scopedListId));

        String panelTemplateVersion = scopedList != null ? scopedList.getTemplateVersion() : findFallbackTemplateVersion(userId, latestListId);
        List<DashboardDtos.ProgressItem> nextUnsolved = panelTemplateVersion == null
                ? List.of()
                : toProgressList(query("""
                    select p.neet250_id, p.order_index, p.title, p.category
                    from problems p
                    where p.template_version = :templateVersion
                      and p.order_index > :farthestOrder
                      and not exists (
                        select 1
                        from lists l
                        join attempt_entries ae on ae.list_id = l.id and ae.user_id = :userId
                        where l.user_id = :userId
                          and l.template_version = p.template_version
                          and ae.neet250_id = p.neet250_id
                          and ae.solved = true
                    """ + scopeCondition + """
                      )
                    order by p.order_index asc
                    limit 4
                    """, userId, scopedListId, panelTemplateVersion, farthestOrder == null ? 0 : farthestOrder));

        long totalSolved = ((Number) singleResult("""
            select count(*)
            from (
              select distinct l.template_version, ae.neet250_id
              from attempt_entries ae
              join lists l on l.id = ae.list_id
              where ae.user_id = :userId and ae.solved = true
              """ + scopeCondition + """
            ) x
            """, userId, scopedListId)).longValue();

        List<DashboardDtos.CategorySolvedStats> solvedByCategory = toCategorySolvedStats(query("""
            with solved_by_problem as (
              select p.category, p.difficulty, p.neet250_id
              from problems p
              join lists l on l.template_version = p.template_version
              where l.user_id = :userId
                and exists (
                  select 1
                  from attempt_entries ae
                  where ae.user_id = :userId
                    and ae.list_id = l.id
                    and ae.neet250_id = p.neet250_id
                    and ae.solved = true
              """ + scopeCondition + """
                )
              group by p.category, p.difficulty, p.neet250_id
            ),
            category_totals as (
              select p.category, count(*) as total_in_category
              from problems p
              where exists (
                select 1
                from lists l
                where l.user_id = :userId
                  and l.template_version = p.template_version
              """ + (scopedListId != null ? " and l.id = :scopedListId " : "") + """
              )
              group by p.category
            )
            select ct.category,
                   coalesce(count(sbp.neet250_id), 0) as solved_count,
                   ct.total_in_category,
                   coalesce(sum(case when sbp.difficulty = 'E' then 1 else 0 end), 0) as easy_solved,
                   coalesce(sum(case when sbp.difficulty = 'M' then 1 else 0 end), 0) as medium_solved,
                   coalesce(sum(case when sbp.difficulty = 'H' then 1 else 0 end), 0) as hard_solved
            from category_totals ct
            left join solved_by_problem sbp on sbp.category = ct.category
            group by ct.category, ct.total_in_category
            order by ct.category
            """, userId, scopedListId));

        Double overallAvgTime = toDouble(singleResult("""
            select avg(ae.time_minutes)
            from attempt_entries ae
            where ae.user_id = :userId
              and ae.time_minutes is not null
            """ + scopeCondition, userId, scopedListId));

        List<DashboardDtos.CategoryAvgTime> byCategoryAvgTime = toCategoryAvgTime(query("""
            select p.category, avg(ae.time_minutes)
            from attempt_entries ae
            join lists l on l.id = ae.list_id
            join problems p on p.template_version = l.template_version and p.neet250_id = ae.neet250_id
            where ae.user_id = :userId
              and ae.time_minutes is not null
            """ + scopeCondition + """
            group by p.category
            order by p.category
            """, userId, scopedListId));

        Set<LocalDate> attemptDays = new HashSet<>();
        for (Object value : query("""
            select distinct ae.date_solved
            from attempt_entries ae
            where ae.user_id = :userId
              and ae.date_solved is not null
              and (
                ae.solved is not null
                or ae.time_minutes is not null
                or ae.attempts is not null
                or ae.confidence is not null
                or ae.time_complexity is not null
                or ae.space_complexity is not null
                or nullif(trim(ae.notes), '') is not null
                or nullif(trim(ae.problem_url), '') is not null
              )
            """ + scopeCondition + """
            order by ae.date_solved asc
            """, userId, scopedListId)) {
            attemptDays.add(toLocalDate(value));
        }

        UserEntity user = userRepository.findById(userId).orElseThrow(() -> new BadRequestException("User not found"));
        LocalDate today = LocalDate.now(resolveZone(user.getTimezone()));
        int streakCurrent = computeCurrentStreak(attemptDays, today);
        double streakAverage = computeAverageStreak(attemptDays);

        return new DashboardDtos.DashboardResponse(scope.value,
                scope == DashboardScope.LATEST ? latestListId : null,
                scope == DashboardScope.LIST ? scopedListId : null,
                lastActivityAt,
                streakCurrent,
                streakAverage,
                farthestCategory,
                farthestOrder,
                farthestProblem,
                new DashboardDtos.SolvedCounts(totalSolved, solvedByCategory),
                new DashboardDtos.TimeAverages(overallAvgTime, byCategoryAvgTime),
                new DashboardDtos.RightPanel(latestSolved, nextUnsolved));
    }

    private String findFallbackTemplateVersion(UUID userId, UUID latestListId) {
        if (latestListId != null) {
            return listRepository.findById(latestListId).map(ListEntity::getTemplateVersion).orElse(null);
        }
        List<ListEntity> lists = listRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        return lists.isEmpty() ? null : lists.get(0).getTemplateVersion();
    }

    private List<?> query(String sql, UUID userId, UUID scopedListId) {
        Query query = entityManager.createNativeQuery(sql).setParameter("userId", userId);
        if (scopedListId != null && sql.contains(":scopedListId")) {
            query.setParameter("scopedListId", scopedListId);
        }
        return query.getResultList();
    }

    private List<?> query(String sql, UUID userId, UUID scopedListId, String templateVersion, int farthestOrder) {
        Query query = entityManager.createNativeQuery(sql)
                .setParameter("userId", userId)
                .setParameter("templateVersion", templateVersion)
                .setParameter("farthestOrder", farthestOrder);
        if (scopedListId != null && sql.contains(":scopedListId")) {
            query.setParameter("scopedListId", scopedListId);
        }
        return query.getResultList();
    }

    private Object singleResult(String sql, UUID userId, UUID scopedListId) {
        Query query = entityManager.createNativeQuery(sql).setParameter("userId", userId);
        if (scopedListId != null && sql.contains(":scopedListId")) {
            query.setParameter("scopedListId", scopedListId);
        }
        return query.getSingleResult();
    }

    private DashboardDtos.ProgressItem toFirstProgress(List<?> rows) {
        if (rows.isEmpty()) {
            return null;
        }
        return toProgress((Object[]) rows.get(0));
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

    private List<DashboardDtos.CategorySolvedStats> toCategorySolvedStats(List<?> rows) {
        List<DashboardDtos.CategorySolvedStats> stats = new ArrayList<>();
        for (Object rowObj : rows) {
            Object[] row = (Object[]) rowObj;
            stats.add(new DashboardDtos.CategorySolvedStats((String) row[0], ((Number) row[1]).longValue(),
                    ((Number) row[2]).longValue(), ((Number) row[3]).longValue(),
                    ((Number) row[4]).longValue(), ((Number) row[5]).longValue()));
        }
        return stats;
    }

    private List<DashboardDtos.CategoryAvgTime> toCategoryAvgTime(List<?> rows) {
        List<DashboardDtos.CategoryAvgTime> stats = new ArrayList<>();
        for (Object rowObj : rows) {
            Object[] row = (Object[]) rowObj;
            stats.add(new DashboardDtos.CategoryAvgTime((String) row[0], toDouble(row[1])));
        }
        return stats;
    }

    private int computeCurrentStreak(Set<LocalDate> dates, LocalDate today) {
        int streak = 0;
        LocalDate cursor = today;
        while (dates.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    private double computeAverageStreak(Set<LocalDate> dates) {
        if (dates.isEmpty()) {
            return 0d;
        }
        List<LocalDate> sorted = dates.stream().sorted(Comparator.naturalOrder()).toList();
        int runs = 0;
        int currentRun = 0;
        int totalLength = 0;
        LocalDate previous = null;
        for (LocalDate date : sorted) {
            if (previous == null || !date.equals(previous.plusDays(1))) {
                if (currentRun > 0) {
                    totalLength += currentRun;
                }
                runs++;
                currentRun = 1;
            } else {
                currentRun++;
            }
            previous = date;
        }
        totalLength += currentRun;
        return (double) totalLength / runs;
    }

    private ZoneId resolveZone(String timezone) {
        try {
            return ZoneId.of(timezone);
        } catch (Exception ignored) {
            return ZoneOffset.UTC;
        }
    }

    private Double toDouble(Object value) {
        if (value == null) {
            return null;
        }
        return ((Number) value).doubleValue();
    }

    private LocalDate toLocalDate(Object value) {
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        if (value instanceof Date sqlDate) {
            return sqlDate.toLocalDate();
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime.toLocalDate();
        }
        if (value instanceof Instant instant) {
            return instant.atZone(ZoneOffset.UTC).toLocalDate();
        }
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime().toLocalDate();
        }
        throw new IllegalArgumentException("Unsupported date_solved value type: " + value.getClass().getName());
    }

    private OffsetDateTime toOffsetDateTime(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime odt) {
            return odt;
        }
        if (value instanceof LocalDateTime ldt) {
            return ldt.atOffset(ZoneOffset.UTC);
        }
        if (value instanceof Instant instant) {
            return instant.atOffset(ZoneOffset.UTC);
        }
        return ((Timestamp) value).toInstant().atOffset(ZoneOffset.UTC);
    }

    private enum DashboardScope {
        LATEST("latest"),
        LIST("list"),
        ALL("all");

        private final String value;

        DashboardScope(String value) {
            this.value = value;
        }

        static DashboardScope from(String rawValue) {
            for (DashboardScope scope : values()) {
                if (scope.value.equalsIgnoreCase(rawValue)) {
                    return scope;
                }
            }
            throw new BadRequestException("scope must be one of: latest, list, all");
        }
    }
}
