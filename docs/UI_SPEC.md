# UI Specification

This document is the canonical UI product/design specification for CodeClimb frontend work. For all frontend implementation tasks, treat this file as the source of truth.

## Design Acceptance Checklist (must pass)

Add this block verbatim to every UI task prompt.

### Design Acceptance Checklist (must pass)

#### Layout

- No page uses a dense HTML table for primary content on Dashboard. Problems page may use list/accordion; if a table is used, it must be visually carded and not spreadsheet-like.
- Max content width is constrained (e.g., 1100–1300px) with centered layout; no edge-to-edge text on desktop.
- Spacing uses an 8px grid: margins/padding are multiples of 8 (8/16/24/32).

#### Typography

- Headings use weight 700+; body 400–500.
- At least 3 distinct text sizes are visible: title (≥24px), section header (~16–18px), body (~14–16px).
- Line-height ≥ 1.4 for body text.

#### Components

- Cards: border-radius ≥ 18px, padding ≥ 16px, subtle shadow (not harsh outline).
- Inputs: radius ≥ 12px, consistent focus ring (not default browser).
- Buttons: visible hover + active states; disabled looks disabled.
- Pills/Tags: used for difficulty + streak/level indicators (not raw text).

#### Color + theme

- Page background changes per theme (not just components).
- Contrast: text against card background is readable (no pastel-on-pastel).
- Difficulty colors are consistent and restrained (no neon).

#### Interaction polish

- Hover/focus transitions are present (150–250ms).
- Loading state exists for dashboard and problems (skeleton or subtle spinner).
- Error state exists (inline message; no alert()).

#### No-spreadsheet rules

- No repeated “Label: Value” vertical dumps for stats; use badges/tiles.
- Avoid heavy gridlines; prefer spacing + subtle dividers.

That turns “pretty” into checkboxes.

## Dashboard UI Data Contract + fallback rules

Add this to the UI prompts so agents can’t guess.

### Dashboard UI Data Contract

Frontend expects `GET /dashboard` (or `?scope=...`) to return:

- `activityDays: string[]` (ISO date strings: `YYYY-MM-DD`)
  - Used to highlight calendar days.
- `streakCurrent: number`
- `streakAverage: number`
- `level: { number: number, label: string }`
  - `number` is `1..N`
  - `label` like `"Arrays & Hashing"`
- `rightPanel: { latestSolved: ProblemCard[]; nextUnsolved: ProblemCard[] }`

`ProblemCard`:

- `neet250_id: number`
- `title: string`
- `category: string`
- `order_index: number`
- `leetcode_url: string`
- `latestAttempt?: AttemptSummary | null`

`AttemptSummary`:

- `attemptId: string`
- `solved?: boolean | null`
- `confidence?: "LOW" | "MEDIUM" | "HIGH" | null`
- `attempts?: number | null`
- `time_minutes?: number | null`
- `time_complexity?: string | null`
- `space_complexity?: string | null`
- `notes?: string | null`
- `date_solved?: string | null` (`YYYY-MM-DD`)

### Fallback rules (must implement)

- If `activityDays` missing/empty → calendar shows no highlights and displays `"No activity yet"`.
- If `rightPanel.nextUnsolved` missing → show 5 placeholder cards with CTA `"Create/select a list"`.
- If `level` missing → show `"Level —"` and hide the badge.
- If user has no lists/attempts → dashboard uses empty-state copy, not broken layout.

If your backend currently doesn’t return `activityDays`/`level`, you have two choices:

- update backend + OpenAPI (best), or
- compute `level` client-side from `farthestCategory` mapping.

But don’t let agents invent fields.

## Logged-out modal-only interaction model

Canonical model: CTA modal

- Logged-out dashboard shows demo content.
- Any interaction (checkbox, input, “Solve”, list selector) opens a single consistent modal:
  - title: `"Log in to start tracking"`
  - buttons: `"Log in"` (primary), `"Create account"` (secondary)
- No surprise redirects on click; only redirect when user chooses.

Add to prompt:

- Logged-out behavior is modal-only. No automatic redirects.

## Autosave semantics + error UX

Add this to both dashboard and problems prompts.

### Autosave Rules

- Debounce: 700ms after last keystroke/change.
- Optimistic UI:
  - update UI immediately
  - show subtle `"Saving..."` indicator per row/card
- Request coalescing:
  - if multiple fields change quickly, send one PATCH with the latest values
  - cancel in-flight requests when a newer change is made (or ignore older responses)
- Failures:
  - show non-blocking inline error `"Couldn’t save. Retry"` on that row/card
  - auto-retry once after 2s for network errors; otherwise wait for user action
  - never spam toasts per keystroke
- Empty-row rule:
  - never POST a new attempt unless `isNonEmpty(draft) == true`
  - if server returns 400 empty-row, silently keep draft but show no error unless user leaves the row

This prevents jank and races.

## Accessibility + font performance constraints

- Contrast: body text must be readable on all themes (avoid low-contrast pastel text).
- Keyboard: tab order works; focus ring visible.
- Reduced motion: respect `prefers-reduced-motion` (disable hover-lift transitions if enabled).
- Fonts:
  - Use at most 2 font families.
  - Load fonts via local bundling (`@fontsource/...`) or system fonts.
  - No runtime fetch from Google Fonts.
- Mobile:
  - layout must stack cleanly; no horizontal scrolling.

## Visual reference vibes + forbidden anti-patterns

### Visual reference vibes (use as north star)

- Duolingo streak/progress card vibes
- Google Calendar mini month grid vibes
- Linear / Notion clean spacing & typography vibes
- Soft, pastel “bento box” dashboards

### Forbidden anti-patterns

- Spreadsheet tables with heavy gridlines
- Default browser selects/inputs
- Tiny text everywhere (≤12px for primary content)
- Harsh borders everywhere (1px gray on white)
- Overly saturated neon colors
- Long label:value stat lists (`"Last activity: ..."` repeated)
