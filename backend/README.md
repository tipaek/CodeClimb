# CodeClimb Backend

Spring Boot 3 / Java 17 backend with PostgreSQL + Flyway.

## Required environment variables

- `DB_URL` (default: `jdbc:postgresql://localhost:5432/codeclimb`)
- `DB_USERNAME` (default: `codeclimb`)
- `DB_PASSWORD` (default: `codeclimb`)
- `JWT_SECRET` (default dev-only value in `application.yml`; set a long random value in real envs)
- `JWT_EXPIRATION_SECONDS` (default: `3600`)
- `PORT` (default: `8080`)

## Run locally

```bash
cd backend
mvn spring-boot:run
```

Flyway migrations run on startup and create:
- `users`
- `lists`
- `problems` (with small seed set)
- `attempt_entries`

## Dashboard analytics definitions

- Scope options: `latest` (default), `list` (`listId` required), and `all`.
- Activity timestamp (`lastActivityAt`): max `attempt_entries.updated_at` in the selected scope.
- Attempt day for streaks: distinct `date_solved` values from rows with at least one meaningful field
  (`solved`, `date_solved`, `time_minutes`, `attempts`, `confidence`, complexity fields, non-blank notes, or non-blank URL).
- Current streak: consecutive attempt days ending at today's date in the user's timezone.
- Average streak: average run length across all streak runs from scoped distinct attempt days (0 when no attempt days).
- Solved per problem: a problem counts as solved when any row in scope has `solved=true`.
- Time averages: computed across all scoped attempt rows where `time_minutes` is non-null.
