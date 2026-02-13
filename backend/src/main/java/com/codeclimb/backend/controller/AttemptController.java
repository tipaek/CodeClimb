package com.codeclimb.backend.controller;

import com.codeclimb.backend.dto.AttemptDtos;
import com.codeclimb.backend.service.AttemptService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
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
@RequestMapping
public class AttemptController {

    private final AttemptService attemptService;

    public AttemptController(AttemptService attemptService) {
        this.attemptService = attemptService;
    }

    @PostMapping("/lists/{listId}/problems/{neetId}/attempts")
    public AttemptDtos.AttemptResponse create(Authentication authentication, @PathVariable UUID listId,
                                              @PathVariable Integer neetId,
                                              @RequestBody AttemptDtos.UpsertAttemptRequest request) {
        return attemptService.create(ControllerSupport.userId(authentication), listId, neetId, request);
    }

    @PatchMapping("/attempts/{attemptId}")
    public AttemptDtos.AttemptResponse update(Authentication authentication, @PathVariable UUID attemptId,
                                              @RequestBody AttemptDtos.UpsertAttemptRequest request) {
        return attemptService.update(ControllerSupport.userId(authentication), attemptId, request);
    }

    @DeleteMapping("/attempts/{attemptId}")
    public void delete(Authentication authentication, @PathVariable UUID attemptId) {
        attemptService.delete(ControllerSupport.userId(authentication), attemptId);
    }

    @GetMapping("/lists/{listId}/problems/{neetId}/attempts")
    public List<AttemptDtos.AttemptResponse> history(Authentication authentication, @PathVariable UUID listId,
                                                     @PathVariable Integer neetId) {
        return attemptService.history(ControllerSupport.userId(authentication), listId, neetId);
    }
}
