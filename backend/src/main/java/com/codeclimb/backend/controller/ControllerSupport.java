package com.codeclimb.backend.controller;

import com.codeclimb.backend.auth.CurrentUser;
import org.springframework.security.core.Authentication;

import java.util.UUID;

public final class ControllerSupport {

    private ControllerSupport() {}

    public static UUID userId(Authentication authentication) {
        return ((CurrentUser) authentication.getPrincipal()).id();
    }
}
