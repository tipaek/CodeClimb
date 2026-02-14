ALTER TABLE attempt_entries
    DROP CONSTRAINT IF EXISTS attempt_entries_neet250_id_fkey;

ALTER TABLE problems
    DROP CONSTRAINT IF EXISTS problems_pkey;

DROP INDEX IF EXISTS uq_problems_template_neet;

ALTER TABLE problems
    ADD CONSTRAINT problems_pkey PRIMARY KEY (template_version, neet250_id);

ALTER TABLE attempt_entries
    ADD COLUMN IF NOT EXISTS template_version VARCHAR(50);

UPDATE attempt_entries ae
SET template_version = l.template_version
FROM lists l
WHERE ae.list_id = l.id
  AND ae.template_version IS NULL;

ALTER TABLE attempt_entries
    ALTER COLUMN template_version SET NOT NULL;

ALTER TABLE attempt_entries
    ADD CONSTRAINT fk_attempt_entries_problem_template
        FOREIGN KEY (template_version, neet250_id)
        REFERENCES problems (template_version, neet250_id);

CREATE INDEX IF NOT EXISTS idx_attempt_template_problem
    ON attempt_entries (template_version, neet250_id);
