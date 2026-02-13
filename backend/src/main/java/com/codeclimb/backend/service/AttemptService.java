package com.codeclimb.backend.service;

import com.codeclimb.backend.dto.AttemptDtos;
import com.codeclimb.backend.entity.AttemptEntryEntity;
import com.codeclimb.backend.repository.AttemptEntryRepository;
import com.codeclimb.backend.repository.ListRepository;
import com.codeclimb.backend.repository.ProblemRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class AttemptService {

    private final AttemptEntryRepository attemptEntryRepository;
    private final ListRepository listRepository;
    private final ProblemRepository problemRepository;

    public AttemptService(AttemptEntryRepository attemptEntryRepository, ListRepository listRepository, ProblemRepository problemRepository) {
        this.attemptEntryRepository = attemptEntryRepository;
        this.listRepository = listRepository;
        this.problemRepository = problemRepository;
    }

    @Transactional
    public AttemptDtos.AttemptResponse create(UUID userId, UUID listId, Integer neetId, AttemptDtos.UpsertAttemptRequest request) {
        ensureOwnedList(userId, listId);
        if (!problemRepository.existsById(neetId)) {
            throw new BadRequestException("Problem not found");
        }
        validateNonEmpty(request);
        AttemptEntryEntity entry = new AttemptEntryEntity();
        entry.setUserId(userId);
        entry.setListId(listId);
        entry.setNeet250Id(neetId);
        applyRequest(entry, request);
        return toResponse(attemptEntryRepository.save(entry));
    }

    @Transactional
    public AttemptDtos.AttemptResponse update(UUID userId, UUID attemptId, AttemptDtos.UpsertAttemptRequest request) {
        validateNonEmpty(request);
        AttemptEntryEntity entry = attemptEntryRepository.findByIdAndUserId(attemptId, userId)
                .orElseThrow(() -> new BadRequestException("Attempt not found"));
        applyRequest(entry, request);
        return toResponse(attemptEntryRepository.save(entry));
    }

    public void delete(UUID userId, UUID attemptId) {
        AttemptEntryEntity entry = attemptEntryRepository.findByIdAndUserId(attemptId, userId)
                .orElseThrow(() -> new BadRequestException("Attempt not found"));
        attemptEntryRepository.delete(entry);
    }

    public List<AttemptDtos.AttemptResponse> history(UUID userId, UUID listId, Integer neetId) {
        ensureOwnedList(userId, listId);
        return attemptEntryRepository.findByUserIdAndListIdAndNeet250IdOrderByUpdatedAtDesc(userId, listId, neetId)
                .stream().map(this::toResponse).toList();
    }

    public static boolean isEmptyAttemptPayload(AttemptDtos.UpsertAttemptRequest request) {
        return request.solved() == null
                && request.dateSolved() == null
                && request.timeMinutes() == null
                && (request.notes() == null || request.notes().isBlank())
                && (request.codeUrl() == null || request.codeUrl().isBlank());
    }

    private void validateNonEmpty(AttemptDtos.UpsertAttemptRequest request) {
        if (isEmptyAttemptPayload(request)) {
            throw new BadRequestException("Attempt payload cannot be empty");
        }
    }

    private void ensureOwnedList(UUID userId, UUID listId) {
        listRepository.findByIdAndUserId(listId, userId).orElseThrow(() -> new BadRequestException("List not found"));
    }

    private void applyRequest(AttemptEntryEntity entry, AttemptDtos.UpsertAttemptRequest request) {
        entry.setSolved(request.solved());
        entry.setDateSolved(request.dateSolved());
        entry.setTimeMinutes(request.timeMinutes());
        entry.setNotes(request.notes());
        entry.setCodeUrl(request.codeUrl());
    }

    private AttemptDtos.AttemptResponse toResponse(AttemptEntryEntity entity) {
        return new AttemptDtos.AttemptResponse(
                entity.getId(), entity.getListId(), entity.getNeet250Id(), entity.getSolved(),
                entity.getDateSolved(), entity.getTimeMinutes(), entity.getNotes(),
                entity.getCodeUrl(), entity.getUpdatedAt());
    }
}
