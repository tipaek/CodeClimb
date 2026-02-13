package com.codeclimb.backend.repository;

import com.codeclimb.backend.entity.ListEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ListRepository extends JpaRepository<ListEntity, UUID> {
    List<ListEntity> findByUserIdOrderByUpdatedAtDesc(UUID userId);
    Optional<ListEntity> findByIdAndUserId(UUID id, UUID userId);
}
