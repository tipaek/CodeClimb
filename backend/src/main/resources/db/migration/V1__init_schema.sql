CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'America/Chicago',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE lists (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    template_version VARCHAR(50) NOT NULL,
    deprecated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE problems (
    neet250_id INTEGER PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    order_index INTEGER NOT NULL
);

CREATE TABLE attempt_entries (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    neet250_id INTEGER NOT NULL REFERENCES problems(neet250_id),
    solved BOOLEAN,
    date_solved DATE,
    time_minutes INTEGER,
    notes TEXT,
    code_url TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_attempt_user_list_problem_updated
    ON attempt_entries (user_id, list_id, neet250_id, updated_at DESC);

CREATE INDEX idx_attempt_user_updated
    ON attempt_entries (user_id, updated_at DESC);

CREATE INDEX idx_attempt_list_date_solved
    ON attempt_entries (list_id, date_solved);
