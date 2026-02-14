package com.codeclimb.backend.service;

import com.codeclimb.backend.dto.ListDtos;
import com.codeclimb.backend.entity.ListEntity;
import com.codeclimb.backend.repository.ListRepository;
import com.codeclimb.backend.repository.ProblemRepository;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class ListService {

    private final ListRepository listRepository;
    private final ProblemRepository problemRepository;

    public ListService(ListRepository listRepository, ProblemRepository problemRepository) {
        this.listRepository = listRepository;
        this.problemRepository = problemRepository;
    }

    public ListDtos.ListResponse create(UUID userId, ListDtos.CreateListRequest request) {
        if (!problemRepository.existsByTemplateVersion(request.templateVersion())) {
            throw new BadRequestException("Unknown template version");
        }
        ListEntity list = new ListEntity();
        list.setId(UUID.randomUUID());
        list.setUserId(userId);
        list.setName(request.name());
        list.setTemplateVersion(request.templateVersion());
        list.setDeprecated(false);
        list.setCreatedAt(OffsetDateTime.now());
        list.setUpdatedAt(OffsetDateTime.now());
        ListEntity saved = listRepository.save(list);
        return toDto(saved);
    }

    public List<ListDtos.ListResponse> all(UUID userId) {
        return listRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream().map(this::toDto).toList();
    }

    public ListDtos.ListResponse rename(UUID userId, UUID id, ListDtos.RenameListRequest request) {
        ListEntity list = listRepository.findByIdAndUserId(id, userId).orElseThrow(() -> new BadRequestException("List not found"));
        list.setName(request.name());
        list.setUpdatedAt(OffsetDateTime.now());
        return toDto(listRepository.save(list));
    }

    public ListDtos.ListResponse deprecate(UUID userId, UUID id) {
        ListEntity list = listRepository.findByIdAndUserId(id, userId).orElseThrow(() -> new BadRequestException("List not found"));
        list.setDeprecated(true);
        list.setUpdatedAt(OffsetDateTime.now());
        return toDto(listRepository.save(list));
    }

    private ListDtos.ListResponse toDto(ListEntity entity) {
        return new ListDtos.ListResponse(entity.getId(), entity.getName(), entity.getTemplateVersion(), entity.isDeprecated());
    }
}
