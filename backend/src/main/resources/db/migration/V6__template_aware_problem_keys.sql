-- Fix known duplicate canonical problems in neet250.v1 prior to uniqueness constraints
UPDATE problems
SET title = 'Delete and Earn',
    leetcode_slug = 'delete-and-earn',
    difficulty = 'M'
WHERE template_version = 'neet250.v1'
  AND neet250_id = 189
  AND leetcode_slug = 'word-break-ii';

UPDATE problems
SET title = 'Minimum Number of Refueling Stops',
    leetcode_slug = 'minimum-number-of-refueling-stops'
WHERE template_version = 'neet250.v1'
  AND neet250_id = 220
  AND leetcode_slug = 'gas-station';

ALTER TABLE problems
    ADD COLUMN id BIGSERIAL;

ALTER TABLE problems
    ALTER COLUMN leetcode_slug SET NOT NULL;

ALTER TABLE attempt_entries
    DROP CONSTRAINT IF EXISTS attempt_entries_neet250_id_fkey;

ALTER TABLE problems
    DROP CONSTRAINT IF EXISTS problems_pkey;

ALTER TABLE problems
    ADD CONSTRAINT problems_pkey PRIMARY KEY (id);

DROP INDEX IF EXISTS uq_problems_template_neet;
DROP INDEX IF EXISTS uq_problems_template_order;

ALTER TABLE problems
    ADD CONSTRAINT uq_problems_template_neet UNIQUE (template_version, neet250_id),
    ADD CONSTRAINT uq_problems_template_order UNIQUE (template_version, order_index),
    ADD CONSTRAINT uq_problems_template_slug UNIQUE (template_version, leetcode_slug);
