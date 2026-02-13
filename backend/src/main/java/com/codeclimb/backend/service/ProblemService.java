package com.codeclimb.backend.service;

import com.codeclimb.backend.dto.ProblemDtos;
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
        listRepository.findByIdAndUserId(listId, userId).orElseThrow(() -> new BadRequestException("List not found"));
        List<?> rows = entityManager.createNativeQuery("""
                select p.neet250_id, p.title, p.category, p.order_index,
                       a.solved, a.date_solved, a.time_minutes, a.notes, a.problem_url, a.updated_at
                from problems p
                left join lateral (
                  select ae.solved, ae.date_solved, ae.time_minutes, ae.notes, ae.problem_url, ae.updated_at
                  from attempt_entries ae
                  where ae.user_id = :userId and ae.list_id = :listId and ae.neet250_id = p.neet250_id
                  order by ae.updated_at desc
                  limit 1
                ) a on true
                order by p.order_index asc
                """)
                .setParameter("userId", userId)
                .setParameter("listId", listId)
                .getResultList();
        List<ProblemDtos.ProblemWithLatestAttemptResponse> out = new ArrayList<>();
        for (Object rowObj : rows) {
            Object[] row = (Object[]) rowObj;
            out.add(new ProblemDtos.ProblemWithLatestAttemptResponse(
                    (Integer) row[0], (String) row[1], (String) row[2], (Integer) row[3],
                    (Boolean) row[4], toLocalDate(row[5]), (Integer) row[6], (String) row[7], (String) row[8], toOffsetDateTime(row[9])));
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
