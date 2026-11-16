---
name: Ration Release
description: How Ration ships — the manual Release GitHub workflow (APK + unsigned IPA), the laptop-safe local build script, Cloudflare web deploy, and Supabase migration/function deploy. Use this skill whenever the user asks to release, ship, deploy, bump a version, build an APK/IPA, push a migration or deploy an edge function. It encodes the memory constraints that make bare Gradle builds forbidden and the exact commands that work.
---

# Ration Release

## Native app releases: the manual workflow (the only path)

Releases run via the **manual `Release` workflow** (Actions tab → Release → Run workflow):
inputs `bump` (`patch|minor|major|none`) and optional `notes` (markdown). The user runs this from
GitHub, or the agent can with `gh workflow run release.yml --ref main -f bump=… -f notes="…"`.

Flow: `tag` job bumps `apps/app/app.json` `expo.version` (commit `chore(app): version X`), pushes,
tags `vX`, creates a **draft** release → `apk` job (android, arm64-v8a+x86_64) ∥ `ipa` job (macos,
unsigned, no HealthKit entitlement) → `publish` job flips the draft public only after both succeeded.
Release notes always carry the Apple Health warning (appended automatically).

- `bump=none` re-uses the existing tag (`--clobber`).
- Build secrets come from repo secrets `SUPABASE_URL` / `SUPABASE_ANON_KEY` (validated by shape
  checks that accept both legacy `eyJ…` JWTs and `sb_publishable_…` keys).
- Watch with `gh run watch <id> --exit-status`; releases appear at
  `https://github.com/spojskic/ration-calorie-tracker/releases`.

## NEVER run a bare local Gradle build

A bare `./gradlew assembleRelease` OOMs even a 15 GB machine during a release build (this is
documented in `scripts/build-android-apk.sh`). The laptop-safe script bakes in
`-Xmx2g -XX:MaxMetaspaceSize=512m`, 2 workers, `--no-daemon`, and defaults to ABIs
`arm64-v8a,x86_64`; `GRADLE_FLAGS` / `ANDROID_ABIS` override. `scripts/build-ios-ipa.sh` exists for
unsigned local IPA builds. Do not run heavy builds while an Android emulator is up, either
(`~/Android/Sdk/emulator/emulator -avd test -gpu lavapipe -no-metrics` needs the memory).

The R8 ProGuard keep rule for WorkManager lives in `app.json`
(`expo-build-properties.extraProguardRules`) and only reaches Gradle through prebuild — a minified
release without it crashes at startup. This is why hand-created `android/` dirs are forbidden.

## Web deploy

`pnpm --filter @ration/app export:web` → `apps/app/dist`, deployed as Cloudflare Worker static
assets via the root `wrangler.jsonc` (site: https://ration.safetpojskic.com). Deployment is manual:
`npx wrangler deploy`. There is NO push-to-deploy workflow; CI on push to `main` only typechecks,
tests and exports.

## Supabase deploys

- Migrations: `npx supabase db push --remote --include-seed` (CLI 3 requires `--remote`; seed order
  `nutrients` first). Never edit pushed migrations; new files must sort after the latest applied.
- Functions: `npx supabase functions deploy <name> --use-api` (hosted consent needs `--yes` in
  agent runs). `sign-up` has `verify_jwt = false`, the others `true` — **never deploy a signed-in
  function with `--no-verify-jwt`**.
- Function secrets: `npx supabase secrets set …`; local dev env in untracked
  `supabase/functions/.env`.

## Rules of engagement for the agent

- Ask before running a release or deploy; the user reviews releases (notes, version) deliberately.
- After a release run, the workflow's version commit lands on `main` — `git pull --rebase` before
  pushing anything else or the push will be rejected non-fast-forward.
- Production evidence beats guessing: Supabase function logs via
  `npx supabase logs --remote --service functions --search "<tag>" --since 24h`.
