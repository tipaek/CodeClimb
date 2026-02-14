package com.codeclimb.backend.contract;

import com.codeclimb.backend.repository.AttemptEntryRepository;
import com.codeclimb.backend.repository.ListRepository;
import com.codeclimb.backend.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OpenApiContractSmokeTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private ListRepository listRepository;
    @Autowired private AttemptEntryRepository attemptEntryRepository;

    @BeforeEach
    void clean() {
        attemptEntryRepository.deleteAll();
        listRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void authResponseShapeMatchesContract() throws Exception {
        String signup = objectMapper.writeValueAsString(new SignupPayload("contract@example.com", "password123", "America/Chicago"));
        mockMvc.perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signup))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.expiresInSeconds").isNumber())
                .andExpect(jsonPath("$.userId").isString())
                .andExpect(jsonPath("$.email").value("contract@example.com"))
                .andExpect(jsonPath("$.timezone").isString());
    }

    @Test
    void attemptValidationErrorShapeMatchesContract() throws Exception {
        String token = signupAndGetToken("attempt-contract@example.com");
        UUID listId = createList(token, "Contract List");

        String invalidPayload = objectMapper.writeValueAsString(new AttemptPayload(null, null, null, "", " "));

        mockMvc.perform(post("/lists/" + listId + "/problems/1/attempts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").isString());
    }

    @Test
    void dashboardResponseShapeMatchesContract() throws Exception {
        String token = signupAndGetToken("dashboard-contract@example.com");

        String body = mockMvc.perform(get("/dashboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.streakCurrent").isNumber())
                .andExpect(jsonPath("$.perCategory").isArray())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode json = objectMapper.readTree(body);
        assertNullableStringOrMissing(json, "latestListId");
        assertNullableStringOrMissing(json, "lastActivityAt");
        assertNullableStringOrMissing(json, "farthestCategory");
        assertNullableNumberOrMissing(json, "farthestOrderIndex");
    }


    private static void assertNullableStringOrMissing(JsonNode json, String fieldName) {
        if (!json.has(fieldName)) {
            return;
        }
        JsonNode node = json.get(fieldName);
        if (!node.isNull() && !node.isTextual()) {
            throw new AssertionError(fieldName + " should be null, missing, or string");
        }
    }

    private static void assertNullableNumberOrMissing(JsonNode json, String fieldName) {
        if (!json.has(fieldName)) {
            return;
        }
        JsonNode node = json.get(fieldName);
        if (!node.isNull() && !node.isNumber()) {
            throw new AssertionError(fieldName + " should be null, missing, or number");
        }
    }

    private String signupAndGetToken(String email) throws Exception {
        String signup = objectMapper.writeValueAsString(new SignupPayload(email, "password123", "America/Chicago"));
        String body = mockMvc.perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signup))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode json = objectMapper.readTree(body);
        return json.get("accessToken").asText();
    }

    private UUID createList(String token, String name) throws Exception {
        String create = objectMapper.writeValueAsString(new CreateListPayload(name, "neet250.v1"));
        String body = mockMvc.perform(post("/lists")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(create))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode json = objectMapper.readTree(body);
        return UUID.fromString(json.get("id").asText());
    }

    private record SignupPayload(String email, String password, String timezone) {}
    private record CreateListPayload(String name, String templateVersion) {}
    private record AttemptPayload(Boolean solved, String dateSolved, Integer timeMinutes, String notes, String problemUrl) {}
}
