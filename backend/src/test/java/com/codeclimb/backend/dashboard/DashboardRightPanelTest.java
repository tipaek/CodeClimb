package com.codeclimb.backend.dashboard;

import com.codeclimb.backend.entity.ProblemEntity;
import com.codeclimb.backend.repository.AttemptEntryRepository;
import com.codeclimb.backend.repository.ListRepository;
import com.codeclimb.backend.repository.ProblemRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
class DashboardRightPanelTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private ListRepository listRepository;
    @Autowired private AttemptEntryRepository attemptEntryRepository;
    @Autowired private ProblemRepository problemRepository;

    @BeforeEach
    void clean() {
        attemptEntryRepository.deleteAll();
        listRepository.deleteAll();
        userRepository.deleteAll();
        problemRepository.deleteAll();
        for (int i = 1; i <= 20; i++) {
            ProblemEntity problem = new ProblemEntity();
            problem.setNeet250Id(i);
            problem.setTemplateVersion("neet250.v1");
            problem.setTitle("Problem " + i);
            problem.setLeetcodeSlug("problem-" + i);
            problem.setCategory("Category");
            problem.setDifficulty('E');
            problem.setOrderIndex(i);
            problemRepository.save(problem);
        }
    }

    @Test
    void noSolvedProblemsReturnsFirstFourAsNextUnsolved() throws Exception {
        String token = signupAndGetToken("dashboard-none@example.com");
        UUID listId = createList(token, "A");
        createAttempt(token, listId, 2, false);

        JsonNode dashboard = getDashboard(token);
        assertThat(dashboard.get("latestSolved")).hasSize(0);
        assertThat(dashboard.get("nextUnsolved")).hasSize(4);
        assertThat(dashboard.at("/nextUnsolved/0/orderIndex").asInt()).isEqualTo(1);
        assertThat(dashboard.at("/nextUnsolved/1/orderIndex").asInt()).isEqualTo(2);
        assertThat(dashboard.at("/nextUnsolved/2/orderIndex").asInt()).isEqualTo(3);
        assertThat(dashboard.at("/nextUnsolved/3/orderIndex").asInt()).isEqualTo(4);
    }

    @Test
    void solvedWithGapsUsesFarthestAndReturnsLatestTwoSolved() throws Exception {
        String token = signupAndGetToken("dashboard-gaps@example.com");
        UUID listId = createList(token, "B");
        createAttempt(token, listId, 2, true);
        createAttempt(token, listId, 3, false);
        createAttempt(token, listId, 5, true);

        JsonNode dashboard = getDashboard(token);
        assertThat(dashboard.at("/farthestSolved/orderIndex").asInt()).isEqualTo(5);
        assertThat(dashboard.at("/latestSolved/0/orderIndex").asInt()).isEqualTo(5);
        assertThat(dashboard.at("/latestSolved/1/orderIndex").asInt()).isEqualTo(2);
        assertThat(dashboard.at("/nextUnsolved/0/orderIndex").asInt()).isEqualTo(6);
        assertThat(dashboard.at("/nextUnsolved/1/orderIndex").asInt()).isEqualTo(7);
        assertThat(dashboard.at("/nextUnsolved/2/orderIndex").asInt()).isEqualTo(8);
        assertThat(dashboard.at("/nextUnsolved/3/orderIndex").asInt()).isEqualTo(9);
    }


    @Test
    void dashboardPreflightOptionsIsAllowedForDevOrigin() throws Exception {
        mockMvc.perform(options("/dashboard")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "GET")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk());
    }

    private JsonNode getDashboard(String token) throws Exception {
        String body = mockMvc.perform(get("/dashboard").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(body);
    }

    private void createAttempt(String token, UUID listId, int neetId, boolean solved) throws Exception {
        String payload = objectMapper.writeValueAsString(new AttemptPayload(solved, null, null, "", ""));
        mockMvc.perform(post("/lists/" + listId + "/problems/" + neetId + "/attempts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());
    }

    private String signupAndGetToken(String email) throws Exception {
        String signup = objectMapper.writeValueAsString(new SignupPayload(email, "password123", "America/Chicago"));
        String body = mockMvc.perform(post("/auth/signup").contentType(MediaType.APPLICATION_JSON).content(signup))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(body).get("accessToken").asText();
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

        return UUID.fromString(objectMapper.readTree(body).get("id").asText());
    }

    private record SignupPayload(String email, String password, String timezone) {}
    private record CreateListPayload(String name, String templateVersion) {}
    private record AttemptPayload(Boolean solved, String dateSolved, Integer timeMinutes, String notes, String problemUrl) {}
}
