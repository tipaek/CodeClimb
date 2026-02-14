package com.codeclimb.backend.problem;

import com.codeclimb.backend.repository.ProblemRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class ProblemDatasetTest {

    @Autowired
    private ProblemRepository problemRepository;

    @Test
    void neet250TemplateHas250Problems() {
        assertThat(problemRepository.countByTemplateVersion("neet250.v1")).isEqualTo(250);
    }
}
