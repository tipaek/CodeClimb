package com.codeclimb.backend.contract;

import com.codeclimb.backend.entity.ListEntity;
import com.codeclimb.backend.entity.UserEntity;
import com.codeclimb.backend.repository.ListRepository;
import com.codeclimb.backend.repository.UserRepository;
import com.codeclimb.backend.security.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiContractSmokeTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private ListRepository listRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private String token;

    @BeforeEach
    void setup() {
        listRepository.deleteAll();
        userRepository.deleteAll();

        UserEntity user = new UserEntity();
        user.setEmail("contract@example.com");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user = userRepository.save(user);

        ListEntity list = new ListEntity();
        list.setUserId(user.getId());
        list.setName("Contract List");
        list.setTemplateVersion("neet250.v1");
        listRepository.save(list);

        token = jwtService.generateToken(user.getId(), user.getEmail());
    }

    @Test
    void signupResponseMatchesContractShape() throws Exception {
        String payload = objectMapper.writeValueAsString(new SignupPayload("shape@example.com", "password123", "America/Chicago"));

        mockMvc.perform(post("/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.expiresInSeconds").isNumber())
                .andExpect(jsonPath("$.userId").isString())
                .andExpect(jsonPath("$.email").value("shape@example.com"))
                .andExpect(jsonPath("$.timezone").isString());
    }

    @Test
    void listAndDashboardResponsesMatchContractShape() throws Exception {
        mockMvc.perform(get("/lists").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").isString())
                .andExpect(jsonPath("$[0].name").isString())
                .andExpect(jsonPath("$[0].templateVersion").isString())
                .andExpect(jsonPath("$[0].deprecated").isBoolean());

        mockMvc.perform(get("/dashboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.streakCurrent").isNumber())
                .andExpect(jsonPath("$.perCategory").isArray());
    }

    private record SignupPayload(String email, String password, String timezone) {}
}
