package com.codeclimb.backend.attempt;

import com.codeclimb.backend.entity.ListEntity;
import com.codeclimb.backend.entity.ProblemEntity;
import com.codeclimb.backend.entity.UserEntity;
import com.codeclimb.backend.repository.ListRepository;
import com.codeclimb.backend.repository.ProblemRepository;
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

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AttemptControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private ListRepository listRepository;
    @Autowired private ProblemRepository problemRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private String token;
    private java.util.UUID listId;

    @BeforeEach
    void setup() {
        problemRepository.deleteAll();
        listRepository.deleteAll();
        userRepository.deleteAll();

        UserEntity user = new UserEntity();
        user.setEmail("attempt@example.com");
        user.setPasswordHash(passwordEncoder.encode("password123"));
        user = userRepository.save(user);

        ListEntity list = new ListEntity();
        list.setName("Main");
        list.setTemplateVersion("v1");
        list.setUserId(user.getId());
        list = listRepository.save(list);
        listId = list.getId();

        ProblemEntity problem = new ProblemEntity();
        problem.setNeet250Id(1);
        problem.setTitle("Two Sum");
        problem.setCategory("Arrays");
        problem.setOrderIndex(1);
        problemRepository.save(problem);

        token = jwtService.generateToken(user.getId(), user.getEmail());
    }

    @Test
    void rejectsEmptyAttemptPayload() throws Exception {
        String body = objectMapper.writeValueAsString(new AttemptPayload(null, null, null, "", " "));
        mockMvc.perform(post("/lists/" + listId + "/problems/1/attempts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createsAttemptWhenPayloadHasMeaningfulField() throws Exception {
        String body = objectMapper.writeValueAsString(new AttemptPayload(true, LocalDate.of(2026, 2, 1), 20, "good", "https://example.com/problem"));
        mockMvc.perform(post("/lists/" + listId + "/problems/1/attempts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.neet250Id").value(1))
                .andExpect(jsonPath("$.problemUrl").value("https://example.com/problem"));
    }

    @Test
    void createAttemptRequiresJwt() throws Exception {
        String body = objectMapper.writeValueAsString(new AttemptPayload(true, null, null, null, null));
        mockMvc.perform(post("/lists/" + listId + "/problems/1/attempts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    private record AttemptPayload(Boolean solved, java.time.LocalDate dateSolved, Integer timeMinutes, String notes, String problemUrl) {}
}
