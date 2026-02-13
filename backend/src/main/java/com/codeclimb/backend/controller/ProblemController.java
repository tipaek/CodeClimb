package com.codeclimb.backend.controller;

import com.codeclimb.backend.dto.ProblemDtos;
import com.codeclimb.backend.service.ProblemService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/lists")
public class ProblemController {

    private final ProblemService problemService;

    public ProblemController(ProblemService problemService) {
        this.problemService = problemService;
    }

    @GetMapping("/{listId}/problems")
    public List<ProblemDtos.ProblemWithLatestAttemptResponse> listWithLatestAttempt(Authentication authentication,
                                                                                     @PathVariable UUID listId) {
        return problemService.listWithLatestAttempt(ControllerSupport.userId(authentication), listId);
    }
}
