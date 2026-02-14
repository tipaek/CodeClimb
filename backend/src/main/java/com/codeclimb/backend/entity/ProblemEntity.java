package com.codeclimb.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "problems", uniqueConstraints = {
        @UniqueConstraint(name = "uq_problems_template_neet", columnNames = {"template_version", "neet250_id"}),
        @UniqueConstraint(name = "uq_problems_template_order", columnNames = {"template_version", "order_index"}),
        @UniqueConstraint(name = "uq_problems_template_slug", columnNames = {"template_version", "leetcode_slug"})
})
@Getter
@Setter
public class ProblemEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "neet250_id", nullable = false)
    private Integer neet250Id;

    @Column(name = "template_version", nullable = false)
    private String templateVersion;

    @Column(nullable = false)
    private String title;

    @Column(name = "leetcode_slug", nullable = false)
    private String leetcodeSlug;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private Character difficulty;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;
}
