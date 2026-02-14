package com.codeclimb.backend.repository;

import com.codeclimb.backend.entity.ProblemEntity;
import com.codeclimb.backend.entity.ProblemEntityId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProblemRepository extends JpaRepository<ProblemEntity, ProblemEntityId> {
    boolean existsByTemplateVersion(String templateVersion);
    boolean existsByTemplateVersionAndNeet250Id(String templateVersion, Integer neet250Id);
    long countByTemplateVersion(String templateVersion);
}
