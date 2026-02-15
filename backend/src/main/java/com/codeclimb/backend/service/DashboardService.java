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

    private static final String ALL_SCOPE_TEMPLATE_VERSION = "neet250.v1";
    private static final String NON_EMPTY_ATTEMPT_PREDICATE = """
            (
              ae.solved is not null
              or ae.time_minutes is not null
              or ae.attempts is not null
              or ae.confidence is not null
              or ae.time_complexity is not null
              or ae.space_complexity is not null
              or nullif(trim(ae.notes), '') is not null
              or nullif(trim(ae.problem_url), '') is not null
            )
            """;

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
        UUID latestOwnedListId = listRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .findFirst()
                .map(ListEntity::getId)
                .orElse(null);
        UUID latestListId = attemptEntryRepository.findLatestListForUser(userId)
                .map(UUID::fromString)
                .orElse(latestOwnedListId);
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
                    new DashboardDtos.RightPanel(List.of(), List.of()));
        }

        String templateVersion = scope == DashboardScope.ALL
                ? ALL_SCOPE_TEMPLATE_VERSION
                : scopedList.getTemplateVersion();
        String scopeAttemptCondition = scope == DashboardScope.ALL ? "" : " and ae.list_id = :scopedListId ";

        OffsetDateTime lastActivityAt = toOffsetDateTime(singleResult("""
            select max(ae.updated_at)
            from attempt_entries ae
            where ae.user_id = :userId
              and
            """ + NON_EMPTY_ATTEMPT_PREDICATE + scopeAttemptCondition, userId, scopedListId));

        DashboardDtos.ProgressItem farthestProblem = toFirstProgress(query("""
            select p.neet250_id, p.order_index, p.title, p.category
            from problems p
            where p.template_version = :templateVersion
              and exists (
                select 1
                from attempt_entries ae
            """ + solvedScopeJoin(scope) + """
                where ae.user_id = :userId
                  and ae.neet250_id = p.neet250_id
                  and ae.solved = true
            """ + solvedScopeWhere(scope) + """
              )
            order by p.order_index desc
            limit 1
            """, userId, scopedListId, templateVersion));

        Integer farthestOrder = farthestProblem == null ? null : farthestProblem.orderIndex();
        String farthestCategory = farthestProblem == null ? null : farthestProblem.category();

        List<DashboardDtos.ProgressItem> latestSolved = toProgressList(query("""
            select p.neet250_id, p.order_index, p.title, p.category
            from problems p
            where p.template_version = :templateVersion
              and exists (
                select 1
                from attempt_entries ae
            """ + solvedScopeJoin(scope) + """
                where ae.user_id = :userId
                  and ae.neet250_id = p.neet250_id
                  and ae.solved = true
            """ + solvedScopeWhere(scope) + """
              )
            order by p.order_index desc
            limit 2
            """, userId, scopedListId, templateVersion));

        List<DashboardDtos.ProgressItem> nextUnsolved = toProgressList(query("""
            select p.neet250_id, p.order_index, p.title, p.category
            from problems p
            where p.template_version = :templateVersion
              and p.order_index > :farthestOrder
              and not exists (
                select 1
                from attempt_entries ae
            """ + solvedScopeJoin(scope) + """
                where ae.user_id = :userId
                  and ae.neet250_id = p.neet250_id
                  and ae.solved = true
            """ + solvedScopeWhere(scope) + """
              )
            order by p.order_index asc
            limit 4
            """, userId, scopedListId, templateVersion, farthestOrder == null ? 0 : farthestOrder));

        long totalSolved = ((Number) singleResult("""
            select count(*)
            from (
              select distinct p.neet250_id
              from problems p
              where p.template_version = :templateVersion
                and exists (
                  select 1
                  from attempt_entries ae
            """ + solvedScopeJoin(scope) + """
                  where ae.user_id = :userId
                    and ae.neet250_id = p.neet250_id
                    and ae.solved = true
            """ + solvedScopeWhere(scope) + """
                )
            ) solved
            """, userId, scopedListId, templateVersion)).longValue();

        List<DashboardDtos.CategorySolvedStats> solvedByCategory = toCategorySolvedStats(query("""
            with category_totals as (
              select p.category, count(*) as total_in_category
              from problems p
              where p.template_version = :templateVersion
              group by p.category
            ),
            solved_by_problem as (
              select p.category, p.neet250_id
              from problems p
              where p.template_version = :templateVersion
                and exists (
                  select 1
                  from attempt_entries ae
            """ + solvedScopeJoin(scope) + """
                  where ae.user_id = :userId
                    and ae.neet250_id = p.neet250_id
                    and ae.solved = true
            """ + solvedScopeWhere(scope) + """
                )
              group by p.category, p.neet250_id
            )
            select ct.category,
                   coalesce(count(sbp.neet250_id), 0) as solved_count,
                   ct.total_in_category
            from category_totals ct
            left join solved_by_problem sbp on sbp.category = ct.category
            group by ct.category, ct.total_in_category
            order by ct.category
            """, userId, scopedListId, templateVersion));

        Set<LocalDate> attemptDays = new HashSet<>();
        for (Object value : query("""
            select distinct ae.date_solved
            from attempt_entries ae
            where ae.user_id = :userId
              and ae.date_solved is not null
              and
            """ + NON_EMPTY_ATTEMPT_PREDICATE + scopeAttemptCondition + """
            order by ae.date_solved asc
            """, userId, scopedListId)) {
            attemptDays.add(toLocalDate(value));
        }

        UserEntity user = userRepository.findById(userId).orElseThrow(() -> new BadRequestException("User not found"));
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
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
                new DashboardDtos.RightPanel(latestSolved, nextUnsolved));
    }

    private String solvedScopeJoin(DashboardScope scope) {
        return scope == DashboardScope.ALL ? " join lists l on l.id = ae.list_id " : "";
    }

    private String solvedScopeWhere(DashboardScope scope) {
        return scope == DashboardScope.ALL
                ? " and l.user_id = :userId and l.template_version = :templateVersion "
                : " and ae.list_id = :scopedListId ";
    }

    private List<?> query(String sql, UUID userId, UUID scopedListId) {
        Query query = entityManager.createNativeQuery(sql).setParameter("userId", userId);
        if (scopedListId != null && sql.contains(":scopedListId")) {
            query.setParameter("scopedListId", scopedListId);
        }
        return query.getResultList();
    }

    private List<?> query(String sql, UUID userId, UUID scopedListId, String templateVersion) {
        Query query = entityManager.createNativeQuery(sql)
                .setParameter("userId", userId)
                .setParameter("templateVersion", templateVersion);
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

    private Object singleResult(String sql, UUID userId, UUID scopedListId, String templateVersion) {
        Query query = entityManager.createNativeQuery(sql)
                .setParameter("userId", userId)
                .setParameter("templateVersion", templateVersion);
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
                    ((Number) row[2]).longValue()));
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
