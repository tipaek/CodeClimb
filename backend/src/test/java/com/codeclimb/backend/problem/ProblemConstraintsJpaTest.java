package com.codeclimb.backend.problem;

import com.codeclimb.backend.entity.ProblemEntity;
import com.codeclimb.backend.repository.ProblemRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:problem-constraints;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class ProblemConstraintsJpaTest {

    @Autowired
    private ProblemRepository problemRepository;

    @Test
    void allowsSameNeetIdAcrossDifferentTemplatesAndRejectsDuplicateSlugPerTemplate() {
        ProblemEntity v1 = new ProblemEntity();
        v1.setTemplateVersion("neet250.v1");
        v1.setNeet250Id(1);
        v1.setOrderIndex(1);
        v1.setTitle("Two Sum");
        v1.setLeetcodeSlug("two-sum");
        v1.setCategory("Arrays & Hashing");
        v1.setDifficulty('E');
        problemRepository.saveAndFlush(v1);

        ProblemEntity v2 = new ProblemEntity();
        v2.setTemplateVersion("neet250.v2");
        v2.setNeet250Id(1);
        v2.setOrderIndex(1);
        v2.setTitle("Two Sum Variant");
        v2.setLeetcodeSlug("two-sum-v2");
        v2.setCategory("Arrays & Hashing");
        v2.setDifficulty('E');
        problemRepository.saveAndFlush(v2);

        assertThat(problemRepository.countByTemplateVersion("neet250.v2")).isEqualTo(1);

        ProblemEntity duplicateSlug = new ProblemEntity();
        duplicateSlug.setTemplateVersion("neet250.v1");
        duplicateSlug.setNeet250Id(2);
        duplicateSlug.setOrderIndex(2);
        duplicateSlug.setTitle("Duplicate Slug");
        duplicateSlug.setLeetcodeSlug("two-sum");
        duplicateSlug.setCategory("Arrays & Hashing");
        duplicateSlug.setDifficulty('E');

        assertThatThrownBy(() -> problemRepository.saveAndFlush(duplicateSlug))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
