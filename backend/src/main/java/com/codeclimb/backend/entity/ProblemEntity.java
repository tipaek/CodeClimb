package com.codeclimb.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "problems")
@IdClass(ProblemEntityId.class)
@Getter
@Setter
public class ProblemEntity {

    @Id
    @Column(name = "template_version", nullable = false)
    private String templateVersion;

    @Id
    @Column(name = "neet250_id")
    private Integer neet250Id;

    @Column(nullable = false)
    private String title;

    @Column(name = "leetcode_slug")
    private String leetcodeSlug;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private Character difficulty;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;
}
