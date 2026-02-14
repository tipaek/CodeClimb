package com.codeclimb.backend.repository;

import com.codeclimb.backend.entity.AttemptEntryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttemptEntryRepository extends JpaRepository<AttemptEntryEntity, UUID> {
    Optional<AttemptEntryEntity> findByIdAndUserId(UUID id, UUID userId);
    List<AttemptEntryEntity> findByUserIdAndListIdAndNeet250IdOrderByUpdatedAtDesc(UUID userId, UUID listId, Integer neet250Id);

    @Query(value = """
        select cast(list_id as varchar) from attempt_entries
        where user_id = :userId
        order by updated_at desc
        limit 1
        """, nativeQuery = true)
    Optional<String> findLatestListForUser(UUID userId);

    @Query(value = """
        select max(updated_at) from attempt_entries
        where user_id = :userId and list_id = :listId
        """, nativeQuery = true)
    Object findLastActivityAt(UUID userId, UUID listId);
}
