package com.codeclimb.backend.service;

import com.codeclimb.backend.dto.ListDtos;
import com.codeclimb.backend.entity.ListEntity;
import com.codeclimb.backend.repository.ListRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ListService {

    private final ListRepository listRepository;

    public ListService(ListRepository listRepository) {
        this.listRepository = listRepository;
    }

    public ListDtos.ListResponse create(UUID userId, ListDtos.CreateListRequest request) {
        ListEntity list = new ListEntity();
        list.setUserId(userId);
        list.setName(request.name());
        list.setTemplateVersion(request.templateVersion());
        list.setDeprecated(false);
        return toResponse(listRepository.save(list));
    }

    public List<ListDtos.ListResponse> list(UUID userId) {
        return listRepository.findByUserIdOrderByUpdatedAtDesc(userId).stream().map(this::toResponse).toList();
    }

    public ListDtos.ListResponse rename(UUID userId, UUID listId, ListDtos.RenameListRequest request) {
        ListEntity list = listRepository.findByIdAndUserId(listId, userId)
                .orElseThrow(() -> new BadRequestException("List not found"));
        list.setName(request.name());
        return toResponse(listRepository.save(list));
    }

    public ListDtos.ListResponse deprecate(UUID userId, UUID listId) {
        ListEntity list = listRepository.findByIdAndUserId(listId, userId)
                .orElseThrow(() -> new BadRequestException("List not found"));
        list.setDeprecated(true);
        return toResponse(listRepository.save(list));
    }

    private ListDtos.ListResponse toResponse(ListEntity list) {
        return new ListDtos.ListResponse(list.getId(), list.getName(), list.getTemplateVersion(), list.isDeprecated());
    }
}
