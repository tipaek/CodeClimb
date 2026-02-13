package com.codeclimb.backend.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public class ListDtos {
    public record CreateListRequest(@NotBlank String name, @NotBlank String templateVersion) {}
    public record RenameListRequest(@NotBlank String name) {}
    public record ListResponse(UUID id, String name, String templateVersion, boolean deprecated) {}
}
