package com.codeclimb.backend.problem;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashSet;

import static org.assertj.core.api.Assertions.assertThat;

class ProblemDatasetTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void neet250TemplateHas250Problems() throws Exception {
        String content = Files.readString(Path.of("../contracts/neet250.v1.json"));
        JsonNode root = objectMapper.readTree(content);

        assertThat(root.path("template_version").asText()).isEqualTo("neet250.v1");
        assertThat(root.path("problems").isArray()).isTrue();
        assertThat(root.path("problems")).hasSize(250);

        HashSet<String> slugs = new HashSet<>();
        for (JsonNode problem : root.path("problems")) {
            slugs.add(problem.path("leetcode_slug").asText());
        }
        assertThat(slugs).hasSize(250);
    }
}
