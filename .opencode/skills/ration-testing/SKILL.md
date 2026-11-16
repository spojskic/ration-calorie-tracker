---
name: Ration Testing
description: How testing works in the Ration repo — PGlite db-tests over real migrations, Playwright ui-smoke with a mocked Supabase backend, RED→GREEN discipline. Use this skill before writing or running ANY test in this repo, before changing SQL/migrations/edge functions, and before touching screens (every route needs a scenario). Covers how to run each layer, what each one can and cannot catch, and the sandbox/terminal constraints that trip agents up.
---

# Ration Testing

Discipline: find the behavior first, then write a failing test (RED), then the smallest fix (GREEN).
The codebase keeps tests beside the code (`*.test.ts`) and database behavior under `tools/db-tests`.

## The layers

| Layer | Where | Covers | Run |
| --- | --- | --- | --- |
| Pure logic | `packages/*`, `tools/importer`, co-located | functions, parsers, math | `pnpm --filter <name> test` |
| Database | `tools/db-tests` | migrations, RLS, triggers, RPCs, edge-function SQL | `cd tools/db-tests && npx vitest run` |
| Browser smoke | `tools/ui-smoke` | real rendered screens against a mocked backend | `node --import tsx src/run.ts -- --only=<substr>` |
| Pure unit (smoke) | `tools/ui-smoke/src/*.test.ts` | app modules imported into Vitest, mock backend | `pnpm --filter @ration/ui-smoke test` |

## db-tests: real SQL, no Docker

`tools/db-tests/src/harness.ts` boots Postgres-in-WASM (PGlite) with `unaccent`/`pg_trgm`, applies
Supabase role stubs (`anon`/`authenticated`/`service_role`, `auth.users`, `auth.uid()`), then runs
**every** `supabase/migrations/*.sql` (skipping `supabase_only` files that need real Supabase). It
runs the migration set TWICE to prove idempotency. ~10 s, no services.

- Impersonate users with `withRole(db, role, userId, fn)` / helpers `asUser`, `asAnon`, `asService`
  (`set role` + `request.jwt.claim.sub`).
- Helpers: `createDb`, `createUsers`, `insertFood`, `insertDiary`, `expectError`.
- Every migration gets a test file here. Edge-function SQL lives in `edge-*.test.ts`.
- **Changing the nutrient catalog (`packages/core/src/nutrients.ts`) means regenerating seeds
  (`pnpm seed:generate`) and the edge nutrient map — commit generated files together with the change.**

## ui-smoke: the app as users see it

`node --import tsx src/run.ts -- --only=<substr>` (in `tools/ui-smoke`) builds the web export, serves
it under `https://app.test` via Playwright route interception, and mocks PostgREST/GoTrue in-process
at `https://mock.supabase.test`. The mock backend (`src/mock-backend.ts`) reproduces unknown columns,
CHECK/FK/unique violations, RLS scoping and the foods-immutability trigger. Fresh browser context +
backend per scenario; fixed clock `2026-11-10T12:00 Europe/Sarajevo`.

- Scenario shape and full example: `tools/ui-smoke/README.md` §"Add or change a scenario". Key fields:
  `name` (unique), `route`, `auth: 'signed-in'`, `fixtures`, `expect: [...]`, `after(page, ctx)` with
  `ctx.step`, `ctx.expectText`, `ctx.expectMutation`, `ctx.backend`.
- **Every route file under `apps/app/src/app/` needs a scenario or `src/harness.test.ts` fails.**
- Input VALUES are asserted with `expectInputValue`, never `expectText`.
- Flags: `--only=<substr>`, `--skip-build`, `--theme=<id>`, `--corners=rounded|boxy`, `--headed`.
  Report lands in `/tmp/cal-ui-smoke/report.md`.
- **The Chrome run needs a normal terminal** (no socket access in sandboxes). Inside a sandbox, run
  only the pure tests: `pnpm --filter @ration/ui-smoke test`.

## What to run before saying "done"

`pnpm typecheck` + `pnpm --filter @ration/app lint` + the test layer(s) you touched. Known
pre-existing locale-dependent failures in ui-smoke (`friends-view` dates, `invite-view` labels) are
NOT regressions. Never claim success without having run the command and read its output.
