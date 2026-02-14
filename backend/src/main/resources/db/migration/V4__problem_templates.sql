ALTER TABLE problems
    ADD COLUMN template_version VARCHAR(50) NOT NULL DEFAULT 'neet250.v1',
    ADD COLUMN leetcode_slug VARCHAR(255),
    ADD COLUMN difficulty CHAR(1) NOT NULL DEFAULT 'M';

ALTER TABLE problems
    ADD CONSTRAINT chk_problem_difficulty CHECK (difficulty IN ('E','M','H'));

CREATE UNIQUE INDEX uq_problems_template_neet ON problems (template_version, neet250_id);
CREATE UNIQUE INDEX uq_problems_template_order ON problems (template_version, order_index);

CREATE INDEX idx_attempt_user_list_solved_updated
    ON attempt_entries (user_id, list_id, solved, updated_at DESC);
