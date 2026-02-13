package com.codeclimb.backend.security;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class JwtServiceTest {

    @Test
    void generateAndParseTokenRoundTripsUserId() {
        JwtService jwtService = new JwtService("test-secret-test-secret-test-secret-123456", 3600);
        UUID userId = UUID.randomUUID();

        String token = jwtService.generateToken(userId, "jwt@example.com");

        assertNotNull(token);
        assertEquals(userId, jwtService.extractUserId(token));
        assertEquals(3600, jwtService.getExpirationSeconds());
    }
}
