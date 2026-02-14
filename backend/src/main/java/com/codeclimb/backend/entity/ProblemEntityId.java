package com.codeclimb.backend.entity;

import java.io.Serializable;
import java.util.Objects;

public class ProblemEntityId implements Serializable {
    private String templateVersion;
    private Integer neet250Id;

    public ProblemEntityId() {
    }

    public ProblemEntityId(String templateVersion, Integer neet250Id) {
        this.templateVersion = templateVersion;
        this.neet250Id = neet250Id;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof ProblemEntityId that)) return false;
        return Objects.equals(templateVersion, that.templateVersion) && Objects.equals(neet250Id, that.neet250Id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(templateVersion, neet250Id);
    }
}
