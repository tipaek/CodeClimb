package com.codeclimb.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "problems")
@Getter
@Setter
public class ProblemEntity {

    @Id
    @Column(name = "neet250_id")
    private Integer neet250Id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String category;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;
}
