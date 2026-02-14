package com.codeclimb.backend.service;

import com.codeclimb.backend.dto.ProblemDtos;
import com.codeclimb.backend.entity.ListEntity;
import com.codeclimb.backend.repository.ListRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ProblemService {

    private final ListRepository listRepository;
    private final EntityManager entityManager;

    public ProblemService(ListRepository listRepository, EntityManager entityManager) {
        this.listRepository = listRepository;
        this.entityManager = entityManager;
    }

    public List<ProblemDtos.ProblemWithLatestAttemptResponse> listWithLatestAttempt(UUID userId, UUID listId) {
        ListEntity list = listRepository.findByIdAndUserId(listId, userId).orElseThrow(() -> new BadRequestException("List not found"));
        List<?> rows = entityManager.createNativeQuery("""
                with latest_per_problem as (
                  select x.template_version, x.neet250_id, x.solved, x.date_solved, x.time_minutes, x.attempts, x.confidence, x.time_complexity, x.space_complexity, x.notes, x.problem_url, x.updated_at
                  from (
                    select l.template_version, ae.neet250_id, ae.solved, ae.date_solved, ae.time_minutes, ae.attempts, ae.confidence, ae.time_complexity, ae.space_complexity, ae.notes, ae.problem_url, ae.updated_at,
                           row_number() over (partition by l.template_version, ae.neet250_id order by ae.updated_at desc) as rn
                    from attempt_entries ae
                    join lists l on l.id = ae.list_id
                    where ae.user_id = :userId and ae.list_id = :listId and l.template_version = :templateVersion
                  ) x
                  where x.rn = 1
                )
                select p.neet250_id, p.order_index, p.title, p.leetcode_slug, p.category, p.difficulty,
                       lpp.solved, lpp.date_solved, lpp.time_minutes, lpp.attempts, lpp.confidence, lpp.time_complexity, lpp.space_complexity, lpp.notes, lpp.problem_url, lpp.updated_at
                from problems p
                left join latest_per_problem lpp on lpp.neet250_id = p.neet250_id and lpp.template_version = p.template_version
                where p.template_version = :templateVersion
                order by p.order_index asc
                """)
                .setParameter("userId", userId)
                .setParameter("listId", listId)
                .setParameter("templateVersion", list.getTemplateVersion())
                .getResultList();
        List<ProblemDtos.ProblemWithLatestAttemptResponse> out = new ArrayList<>();
        for (Object rowObj : rows) {
            Object[] row = (Object[]) rowObj;
            ProblemDtos.LatestAttempt latestAttempt = row[6] == null && row[7] == null && row[8] == null
                    && row[9] == null && row[10] == null && row[11] == null && row[12] == null
                    && row[13] == null && row[14] == null && row[15] == null
                    ? null
                    : new ProblemDtos.LatestAttempt((Boolean) row[6], toLocalDate(row[7]), row[8] == null ? null : ((Number) row[8]).intValue(),
                    row[9] == null ? null : ((Number) row[9]).intValue(), row[10] == null ? null : row[10].toString(),
                    (String) row[11], (String) row[12], (String) row[13], (String) row[14], toOffsetDateTime(row[15]));
            out.add(new ProblemDtos.ProblemWithLatestAttemptResponse(
                    ((Number) row[0]).intValue(), ((Number) row[1]).intValue(), (String) row[2], (String) row[3], (String) row[4], row[5].toString().trim(), latestAttempt));
        }
        return out;
    }

    private LocalDate toLocalDate(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof LocalDate localDate) {
            return localDate;
        }
        return ((Date) value).toLocalDate();
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
