package com.codeclimb.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public class AuthDtos {
    public record SignupRequest(@Email String email, @NotBlank String password, String timezone) {}
    public record LoginRequest(@Email String email, @NotBlank String password) {}
    public record AuthResponse(String accessToken, long expiresInSeconds, UUID userId, String email, String timezone) {}
}
