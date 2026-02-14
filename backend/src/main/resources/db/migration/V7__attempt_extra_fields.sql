ALTER TABLE attempt_entries
    ADD COLUMN attempts INTEGER,
    ADD COLUMN confidence VARCHAR(16),
    ADD COLUMN time_complexity VARCHAR(64),
    ADD COLUMN space_complexity VARCHAR(64);
