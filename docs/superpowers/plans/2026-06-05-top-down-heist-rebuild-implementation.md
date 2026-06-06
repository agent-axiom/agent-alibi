# Top-Down Heist Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable top-down arcade slice of Agent Alibi with dynamic music, movement, AI rivals, loot, escape, and a final case file.

**Architecture:** Keep the existing game engine for online/card mode, add a local-only Phaser arcade scene for Play Now. React owns routing, audio, final result, and HUD state; Phaser owns real-time movement and mission simulation.

**Tech Stack:** React, TypeScript, Phaser 3, Vitest, Playwright, existing pnpm monorepo.

---

### Task 1: Music Phase And Arcade Result Tests

**Files:**
- Create: `apps/web/src/arcade/music.ts`
- Create: `apps/web/src/arcade/music.test.ts`
- Create: `apps/web/src/arcade/arcade-rules.ts`
- Create: `apps/web/src/arcade/arcade-rules.test.ts`

- [ ] Write tests that prove menu, stealth, alarm, and lockdown track selection.
- [ ] Run the web test command and confirm the new tests fail because the modules do not exist.
- [ ] Implement the pure track selector.
- [ ] Write tests that prove arcade result scoring creates a final case file with loot, escape, and title.
- [ ] Run the focused web tests and confirm they pass.
- [ ] Commit `test: cover arcade music and results`.

### Task 2: Dynamic Music Hook

**Files:**
- Create: `apps/web/src/audio/useDynamicMusic.ts`
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/lobby/HomeScreen.tsx`
- Modify: `apps/web/src/styles/global.css`

- [ ] Implement a hook that creates looped audio elements for the four known files.
- [ ] Crossfade from the current track to the requested track.
- [ ] Add a sound toggle to the home screen and unlock audio on Play Now.
- [ ] Wire music phase from screen and local arcade HUD.
- [ ] Run `pnpm --filter @agent-alibi/web typecheck`.
- [ ] Commit `feat: add dynamic heist music`.

### Task 3: Arcade Mission Scene

**Files:**
- Create: `apps/web/src/arcade/arcade-types.ts`
- Create: `apps/web/src/arcade/ArcadeHeistScene.ts`
- Create: `apps/web/src/arcade/ArcadeHeistStage.tsx`
- Modify: `apps/web/src/local/useLocalMatch.ts`
- Modify: `apps/web/src/game-ui/MatchScreen.tsx`
- Modify: `apps/web/src/styles/global.css`

- [ ] Add typed HUD/result contracts between Phaser and React.
- [ ] Build a Phaser scene with world bounds, vault rooms, corridor art, player movement, dash, AI movement, artifact pickups, alarm, timer, and escape.
- [ ] Report HUD updates to React at a throttled cadence.
- [ ] Finish the mission via escape/timer/lockdown and convert the result to a match summary.
- [ ] Keep online rooms on the existing card-oriented fallback.
- [ ] Run `pnpm --filter @agent-alibi/web typecheck`.
- [ ] Commit `feat: add top-down arcade heist`.

### Task 4: Smoke Test And Visual QA

**Files:**
- Modify: `tests/e2e/play-now.spec.ts`
- Modify as needed from visual findings.

- [ ] Update Playwright smoke test for the arcade flow and debug finish hook.
- [ ] Run `pnpm test`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm build`.
- [ ] Run `pnpm exec playwright test`.
- [ ] Open the local app in the in-app browser and inspect desktop/mobile screenshots.
- [ ] Commit `test: smoke arcade heist flow`.

