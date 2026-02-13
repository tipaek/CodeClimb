package com.codeclimb.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationSeconds;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-seconds}") long expirationSeconds) {
        this.expirationSeconds = expirationSeconds;
        byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
        byte[] keyBytes = raw.length >= 32 ? raw : Arrays.copyOf(raw, 32);
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(UUID userId, String email) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expirationSeconds)))
                .signWith(signingKey)
                .compact();
    }

    public UUID extractUserId(String token) {
        Claims claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
        return UUID.fromString(claims.getSubject());
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }
}
