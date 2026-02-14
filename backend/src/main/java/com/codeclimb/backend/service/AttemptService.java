package com.codeclimb.backend.service;

import com.codeclimb.backend.dto.AttemptDtos;
import com.codeclimb.backend.entity.AttemptEntryEntity;
import com.codeclimb.backend.entity.ListEntity;
import com.codeclimb.backend.repository.AttemptEntryRepository;
import com.codeclimb.backend.repository.ListRepository;
import com.codeclimb.backend.repository.ProblemRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class AttemptService {

    private final AttemptEntryRepository attemptEntryRepository;
    private final ListRepository listRepository;
    private final ProblemRepository problemRepository;

    public AttemptService(AttemptEntryRepository attemptEntryRepository,
                          ListRepository listRepository,
                          ProblemRepository problemRepository) {
        this.attemptEntryRepository = attemptEntryRepository;
        this.listRepository = listRepository;
        this.problemRepository = problemRepository;
    }

    public AttemptDtos.AttemptResponse create(UUID userId, UUID listId, Integer neetId, AttemptDtos.UpsertAttemptRequest request) {
        ListEntity list = listRepository.findByIdAndUserId(listId, userId).orElseThrow(() -> new BadRequestException("List not found"));
        if (!problemRepository.existsByTemplateVersionAndNeet250Id(list.getTemplateVersion(), neetId)) {
            throw new BadRequestException("Problem not found");
        }
        validatePayload(request);
        AttemptEntryEntity entry = new AttemptEntryEntity();
        entry.setId(UUID.randomUUID());
        entry.setUserId(userId);
        entry.setListId(listId);
        entry.setNeet250Id(neetId);
        entry.setSolved(request.solved());
        entry.setDateSolved(request.dateSolved());
        entry.setTimeMinutes(request.timeMinutes());
        entry.setNotes(request.notes());
        entry.setProblemUrl(request.problemUrl());
        entry.setCreatedAt(OffsetDateTime.now());
        entry.setUpdatedAt(OffsetDateTime.now());
        return toDto(attemptEntryRepository.save(entry));
    }

    public AttemptDtos.AttemptResponse update(UUID userId, UUID attemptId, AttemptDtos.UpsertAttemptRequest request) {
        AttemptEntryEntity entry = attemptEntryRepository.findByIdAndUserId(attemptId, userId)
                .orElseThrow(() -> new BadRequestException("Attempt not found"));
        validatePayload(request);
        entry.setSolved(request.solved());
        entry.setDateSolved(request.dateSolved());
        entry.setTimeMinutes(request.timeMinutes());
        entry.setNotes(request.notes());
        entry.setProblemUrl(request.problemUrl());
        entry.setUpdatedAt(OffsetDateTime.now());
        return toDto(attemptEntryRepository.save(entry));
    }


    public AttemptDtos.AttemptResponse patch(UUID userId, UUID attemptId, AttemptDtos.UpsertAttemptRequest request) {
        return update(userId, attemptId, request);
    }

    public void delete(UUID userId, UUID attemptId) {
        AttemptEntryEntity entry = attemptEntryRepository.findByIdAndUserId(attemptId, userId)
                .orElseThrow(() -> new BadRequestException("Attempt not found"));
        attemptEntryRepository.delete(entry);
    }

    public List<AttemptDtos.AttemptResponse> history(UUID userId, UUID listId, Integer neetId) {
        listRepository.findByIdAndUserId(listId, userId).orElseThrow(() -> new BadRequestException("List not found"));
        return attemptEntryRepository.findByUserIdAndListIdAndNeet250IdOrderByUpdatedAtDesc(userId, listId, neetId)
                .stream().map(this::toDto).toList();
    }

    private void validatePayload(AttemptDtos.UpsertAttemptRequest request) {
        if (isEmptyAttemptPayload(request)) {
            throw new BadRequestException("Attempt payload must include at least one meaningful field");
        }
    }

    public static boolean isEmptyAttemptPayload(AttemptDtos.UpsertAttemptRequest request) {
        return request.solved() == null
                && request.dateSolved() == null
                && request.timeMinutes() == null
                && (request.notes() == null || request.notes().isBlank())
                && (request.problemUrl() == null || request.problemUrl().isBlank());
    }

    private AttemptDtos.AttemptResponse toDto(AttemptEntryEntity entity) {
        return new AttemptDtos.AttemptResponse(entity.getId(), entity.getListId(), entity.getNeet250Id(), entity.getSolved(),
                entity.getDateSolved(), entity.getTimeMinutes(), entity.getNotes(), entity.getProblemUrl(), entity.getUpdatedAt());
    }
}
