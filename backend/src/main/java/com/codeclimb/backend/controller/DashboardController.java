package com.codeclimb.backend.controller;

import com.codeclimb.backend.dto.DashboardDtos;
import com.codeclimb.backend.service.DashboardService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public DashboardDtos.DashboardResponse get(Authentication authentication,
                                               @RequestParam(defaultValue = "latest") String scope,
                                               @RequestParam(required = false) UUID listId) {
        return dashboardService.getDashboard(ControllerSupport.userId(authentication), scope, listId);
    }
}
