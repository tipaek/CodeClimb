# CodeClimb 🧗‍♂️

CodeClimb is a clean, fast NeetCode 250 tracker built for consistent practice. Track attempts with inline editing + autosave, visualize your streak and progress, and always know what to solve next.

**Live app:** https://codeclimb-app.vercel.app/

---

## What you can do

- **Track NeetCode 250 progress** across categories and difficulties
- **Log attempts quickly** (confidence, notes, time/space complexity, time taken, etc.)
- **Inline edit + autosave** (no “Save” button workflow)
- **Attempt history per problem** (edit or delete older entries)
- **Dashboard insights**
  - activity calendar + streaks
  - farthest category / “level” progression
  - “Up Next” list (latest solved + next unsolved problems)

---

## Tech stack

- **Frontend:** React + TypeScript (Vercel)
- **Backend:** Spring Boot (Java 17, Maven) (Google Cloud Run)
- **Database:** Postgres (Neon) + Flyway migrations
- **API:** OpenAPI-first contract + generated types for client safety

---

## Screenshots
> <img width="1102" height="1102" alt="image" src="https://github.com/user-attachments/assets/e37285b1-28f8-4b82-a0ad-31be8e4fab94" />

> <img width="1336" height="1088" alt="image" src="https://github.com/user-attachments/assets/f5e2e02b-abc7-4e8d-afbe-6ee0485ee15d" />



---

## Local development

### Prerequisites
- Node.js (npm)
- Java 17
- A Postgres database (local or Neon)

### 1) Clone
```bash
git clone <YOUR_REPO_URL>.git
cd CodeClimb
```

### 2) Frontend
```
cd frontend
npm ci
npm run dev
```

### 3) Backend
Set environmental variables:
```
export DATABASE_URL="jdbc:postgresql://<host>:<port>/<db>?sslmode=require"
export DB_USER="<user>"
export DB_PASSWORD="<password>"
export JWT_SECRET="<long-random-secret>"
```
then run:
```
cd backend
./mvnw spring-boot:run
```
Verify (from repo root):
```
make verify
```
