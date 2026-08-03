# Harter Kern / 2 Fast 2 Drink – Architecture & Development Rules

## Repository als verbindliche Grundlage
- Always begin from the current `main` branch.
- Inspect the existing implementation before changing code.
- Do not rely on old chat assumptions when the repository differs.
- Never modify `sources/`.

## Product scope
`2 Fast 2 Drink` remains the active development priority. Future platform areas such as Dänemark, Last One Drinking, the card game, dates, birthdays, photos, videos and wiki content are separate modules and must not be introduced incidentally.

## Data architecture
- Supabase/PostgreSQL is the single source of truth.
- Rankings, records, badges, trophies, Most Wanted, BINGO and statistics are derived from qualified source data.
- Do not maintain duplicate ranking or badge logic in React.
- Productively applied migrations must never be edited retroactively.
- Database changes use new additive migrations.
- Avoid destructive SQL and broad `DROP ... CASCADE`.

## Qualification rules
- DNF is not a valid time.
- Soft-deleted records are excluded.
- AK attempts do not create official long-term performance records.
- Guests are event-bound and do not receive permanent player achievements.
- Historical attempts may count for Hall of Fame, PB, WR, Most Wanted, BINGO and qualified performance badges.
- Historical attempts do not count for event wins, event participation, podiums or event-only streaks.
- Never invent historical times of day.
- Existing tie and podium rules remain centralized in the database.

## Route data loading
- The root provider must not block every route on the complete application snapshot.
- Each route loads only the data required for its core content.
- Live raw data is loaded only for Live, management and relevant historical workflows.
- Expensive optional modules load independently.
- A timeout in an optional module must not replace the entire route with a global error state.
- Identical concurrent requests should be deduplicated.
- Focus, visibility and Realtime invalidation must target affected data groups only.
- New features must document their request count and route impact.

## Performance rules
Before introducing a new read model:
- identify which route needs it,
- avoid loading it globally,
- measure its production-like execution time,
- inspect nested view expansion,
- add indexes only with evidence,
- prefer focused route payloads over repeated broad reads.

Do not solve structural query problems only by increasing PostgreSQL statement timeouts.

For performance-sensitive changes, document request count, total route load duration, slowest query, cold-load behavior, hard reload behavior, focus behavior and Realtime behavior.

## UI and responsive behavior
- Preserve the established dark, premium and sports-oriented design language.
- Gold remains the primary prestige accent.
- Desktop and mobile must be reviewed separately.
- Standard review widths: 360, 390, 430, 1280, 1440 and 1920 px.
- The page itself must not gain horizontal overflow.
- Do not globally change working avatar components to fix a local layout issue.
- Most Wanted uses first-hit avatars.
- Personal BINGO never shows avatars inside its 10×10 grid.

## Realtime and deduplication
- Realtime updates source data and invalidates derived read groups.
- Realtime echoes must not replay local badge or prestige animations.
- Stable IDs must be used for derived activities and awards.
- Avoid duplicate subscriptions, polling loops and refresh storms.
- A mutation should refresh only the data groups affected by that mutation.

## Token-efficient Codex workflow
Codex performs one role per phase.

### Phase 0 – Scope
Define what belongs in the PR, what is excluded, acceptance criteria and whether SQL or UI work is allowed. New ideas go to the backlog unless necessary for the approved scope.

### Phase 1 – Analysis only
Allowed: inspect relevant files, trace data flow, inspect SQL and tests, identify cause and propose a minimal plan.

Not allowed: code changes, tests, build, browser, commit, push or PR.

### Phase 2 – Implementation only
Implement only the approved change and focused tests. No full suite, browser review, Vercel review or release work.

### Phase 3 – Quick verification
Run TypeScript, ESLint when useful and directly affected tests. Do not run the full suite after every edit.

### Phase 4 – Full verification
After implementation is stable: complete Vitest suite, production build, relevant pgTAP and SQL validation when database code changed.

### Phase 5 – Preview review
After automated verification: Vercel preview, direct routes, hard reload, mobile, desktop, console, Realtime and relevant keyboard/touch interactions.

### Phase 6 – Release
Commit, push, create Draft PR and write the implementation summary.

### Phase 7 – Product review
The user reviews the real preview. Mark ready and merge only after approval.

## Prompt rules
- Use the smallest possible task.
- Do not chain analysis, implementation, full tests, browser review and release into one prompt.
- Avoid “and afterwards also…” expansion.
- Inspect likely affected files first rather than the entire repository.
- Start a fresh Codex context after major milestones.
- Use a current handoff document, but verify all facts against `main`.

## Test policy
During development, run affected tests only.

Before merge-ready status:
- ESLint,
- TypeScript,
- full Vitest suite,
- production build,
- relevant pgTAP,
- Vercel preview,
- manual mobile and desktop review.

A green automated suite is not a substitute for preview testing.

## Git- und Release-Status
Immer klar unterscheiden zwischen:
- lokal geändert,
- committed,
- gepusht,
- Pull Request erstellt,
- Preview deployt,
- gemergt,
- produktiv live.

Eine Änderung ist erst produktiv live, wenn sie in `main` gemergt und das
Produktionsdeployment abgeschlossen ist.

## Security and production safety
- Preserve RLS and existing authorization checks.
- Do not treat the local management code as database authorization.
- Admin database and storage operations require the established Supabase session and admin checks.
- Do not log secrets or personal data during performance instrumentation.
- Do not mutate production data merely to test Realtime without explicit approval.

## Current architectural principle
Core pages must remain available even when optional analytics fail.

Examples:
- Hall of Fame must not wait for Most Wanted, BINGO, badge rarity or prestige activity.
- A player profile should show core identity and performance data if BINGO temporarily fails.
- Statistics should expose local module errors instead of one global failure screen.
