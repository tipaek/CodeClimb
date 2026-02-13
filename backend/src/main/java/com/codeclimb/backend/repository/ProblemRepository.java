package com.codeclimb.backend.repository;

import com.codeclimb.backend.entity.ProblemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProblemRepository extends JpaRepository<ProblemEntity, Integer> {
}
