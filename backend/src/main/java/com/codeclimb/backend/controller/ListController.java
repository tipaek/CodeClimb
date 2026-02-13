package com.codeclimb.backend.controller;

import com.codeclimb.backend.dto.ListDtos;
import com.codeclimb.backend.service.ListService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/lists")
public class ListController {

    private final ListService listService;

    public ListController(ListService listService) {
        this.listService = listService;
    }

    @PostMapping
    public ListDtos.ListResponse create(Authentication authentication, @Valid @RequestBody ListDtos.CreateListRequest request) {
        return listService.create(ControllerSupport.userId(authentication), request);
    }

    @GetMapping
    public List<ListDtos.ListResponse> list(Authentication authentication) {
        return listService.list(ControllerSupport.userId(authentication));
    }

    @PatchMapping("/{id}")
    public ListDtos.ListResponse rename(Authentication authentication, @PathVariable UUID id,
                                        @Valid @RequestBody ListDtos.RenameListRequest request) {
        return listService.rename(ControllerSupport.userId(authentication), id, request);
    }

    @PostMapping("/{id}/deprecate")
    public ListDtos.ListResponse deprecate(Authentication authentication, @PathVariable UUID id) {
        return listService.deprecate(ControllerSupport.userId(authentication), id);
    }
}
