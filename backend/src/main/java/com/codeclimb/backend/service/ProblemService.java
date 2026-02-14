package com.codeclimb.backend.service;

import com.codeclimb.backend.dto.ProblemDtos;
import com.codeclimb.backend.entity.ListEntity;
import com.codeclimb.backend.repository.ListRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;

import java.sql.Date;
import java.sql.Timestamp;
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
                select p.neet250_id, p.order_index, p.title, p.leetcode_slug, p.category, p.difficulty,
                       a.solved, a.date_solved, a.time_minutes, a.notes, a.problem_url, a.updated_at
                from problems p
                left join lateral (
                  select ae.solved, ae.date_solved, ae.time_minutes, ae.notes, ae.problem_url, ae.updated_at
                  from attempt_entries ae
                  join lists l on l.id = ae.list_id
                  where ae.user_id = :userId and ae.list_id = :listId and ae.neet250_id = p.neet250_id
                    and l.template_version = p.template_version
                  order by ae.updated_at desc
                  limit 1
                ) a on true
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
                    && row[9] == null && row[10] == null && row[11] == null
                    ? null
                    : new ProblemDtos.LatestAttempt((Boolean) row[6], toLocalDate(row[7]), (Integer) row[8], (String) row[9], (String) row[10], toOffsetDateTime(row[11]));
            out.add(new ProblemDtos.ProblemWithLatestAttemptResponse(
                    (Integer) row[0], (Integer) row[1], (String) row[2], (String) row[3], (String) row[4], (String) row[5], latestAttempt));
        }
        return out;
    }

    private java.time.LocalDate toLocalDate(Object value) {
        return value == null ? null : ((Date) value).toLocalDate();
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
