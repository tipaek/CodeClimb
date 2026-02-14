package com.codeclimb.backend.service;

import com.codeclimb.backend.dto.AttemptDtos;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AttemptServiceTest {

    @Test
    void emptyPayloadIsRejectedPredicateTrue() {
        var payload = new AttemptDtos.UpsertAttemptRequest(null, null, null, null, null, null, null, "", "  ");
        assertTrue(AttemptService.isEmptyAttemptPayload(payload));
    }

    @Test
    void solvedFieldMakesPayloadNonEmpty() {
        var payload = new AttemptDtos.UpsertAttemptRequest(Boolean.TRUE, null, null, null, null, null, null, null, null);
        assertFalse(AttemptService.isEmptyAttemptPayload(payload));
    }

    @Test
    void dateSolvedFieldMakesPayloadNonEmpty() {
        var payload = new AttemptDtos.UpsertAttemptRequest(null, java.time.LocalDate.of(2026, 1, 1), null, null, null, null, null, null, null);
        assertFalse(AttemptService.isEmptyAttemptPayload(payload));
    }

    @Test
    void timeMinutesFieldMakesPayloadNonEmpty() {
        var payload = new AttemptDtos.UpsertAttemptRequest(null, null, 15, null, null, null, null, null, null);
        assertFalse(AttemptService.isEmptyAttemptPayload(payload));
    }

    @Test
    void notesFieldMakesPayloadNonEmpty() {
        var payload = new AttemptDtos.UpsertAttemptRequest(null, null, null, null, null, null, null, "Need to revisit", null);
        assertFalse(AttemptService.isEmptyAttemptPayload(payload));
    }

    @Test
    void problemUrlFieldMakesPayloadNonEmpty() {
        var payload = new AttemptDtos.UpsertAttemptRequest(null, null, null, null, null, null, null, null, "https://example.com/sol");
        assertFalse(AttemptService.isEmptyAttemptPayload(payload));
    }

    @Test
    void confidenceFieldMakesPayloadNonEmpty() {
        var payload = new AttemptDtos.UpsertAttemptRequest(null, null, null, null, "HIGH", null, null, null, null);
        assertFalse(AttemptService.isEmptyAttemptPayload(payload));
    }

    @Test
    void attemptsFieldMakesPayloadNonEmpty() {
        var payload = new AttemptDtos.UpsertAttemptRequest(null, null, null, 2, null, null, null, null, null);
        assertFalse(AttemptService.isEmptyAttemptPayload(payload));
    }
}
