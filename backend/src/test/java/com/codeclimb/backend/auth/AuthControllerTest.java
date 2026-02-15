package com.codeclimb.backend.auth;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:codeclimb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ListRepository listRepository;

    @BeforeEach
    void cleanUsers() {
        listRepository.deleteAll();
        userRepository.deleteAll();
    }

    @Test
    void signupThenLogin() throws Exception {
        var signup = objectMapper.writeValueAsString(new SignupPayload("user@example.com", "password123", "America/Chicago"));
        String signupBody = mockMvc.perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signup))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode signupJson = objectMapper.readTree(signupBody);
        String accessToken = signupJson.get("accessToken").asText();

        mockMvc.perform(get("/lists").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("NeetCode 250"))
                .andExpect(jsonPath("$[0].templateVersion").value("neet250.v1"));

        var login = objectMapper.writeValueAsString(new LoginPayload("user@example.com", "password123"));
        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(login))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.email").value("user@example.com"));
    }

    @Test
    void duplicateSignupReturnsBadRequest() throws Exception {
        var signup = objectMapper.writeValueAsString(new SignupPayload("dupe@example.com", "password123", "America/Chicago"));
        mockMvc.perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signup))
                .andExpect(status().isOk());

        mockMvc.perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signup))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Email already exists"));
    }

    @Test
    void protectedEndpointRejectsMissingJwt() throws Exception {
        mockMvc.perform(get("/lists"))
                .andExpect(status().isUnauthorized());
    }

    private record SignupPayload(String email, String password, String timezone) {}
    private record LoginPayload(String email, String password) {}
}
