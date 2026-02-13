package com.codeclimb.backend.auth;

import java.util.UUID;

public record CurrentUser(UUID id, String email) {
}
