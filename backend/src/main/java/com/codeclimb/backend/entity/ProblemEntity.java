package com.codeclimb.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "problems")
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

    public Integer getNeet250Id() { return neet250Id; }
    public void setNeet250Id(Integer neet250Id) { this.neet250Id = neet250Id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
}
