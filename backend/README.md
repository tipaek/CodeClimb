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
