# Arcade Heist Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first playable minute feel like a top-down arcade heist instead of a schematic map with HUD overlays.

**Architecture:** Keep the existing Phaser scene and React HUD, but move the next quality jump into `ArcadeHeistScene`: fewer text labels in the world, richer room/corridor art, clearer route visuals, and faster Red Crew pressure after the first pickup. Add debug-state contracts so Playwright can assert the new presentation and gameplay feel.

**Tech Stack:** TypeScript, Phaser, React, Vitest, Playwright.

---

### Task 1: Test The New Opening Presentation

**Files:**
- Modify: `tests/e2e/play-now.spec.ts`
- Modify: `apps/web/src/arcade/ArcadeHeistScene.ts`

- [x] **Step 1: Write the failing Playwright assertion**

In the opening section of `solo match starts and reaches final case file`, replace the old expectation that all room labels are visible with:

```ts
expect(initialTarget?.worldPresentation).toEqual(
  expect.objectContaining({
    style: "arcade-heist",
    visibleRoomLabels: expect.any(Number),
    ambientLightCount: expect.any(Number),
    floorDetailCount: expect.any(Number),
    routeSignalMode: "minimal"
  })
);
expect(initialTarget?.worldPresentation?.visibleRoomLabels).toBeLessThanOrEqual(3);
expect(initialTarget?.worldPresentation?.ambientLightCount).toBeGreaterThanOrEqual(10);
expect(initialTarget?.worldPresentation?.floorDetailCount).toBeGreaterThanOrEqual(24);
```

- [x] **Step 2: Run RED**

Run:

```bash
pnpm exec playwright test tests/e2e/play-now.spec.ts -g "solo match starts and reaches final case file"
```

Expected: fails because `worldPresentation` does not exist and room label expectations are still schematic.

- [x] **Step 3: Implement world presentation debug state**

Add counters to `ArcadeHeistScene`:

```ts
private visibleRoomLabelCount = 0;
private ambientLightCount = 0;
private floorDetailCount = 0;
```

Reset them in `startMission`, increment them in new drawing helpers, and expose:

```ts
worldPresentation: this.worldPresentationDebug()
```

with:

```ts
private worldPresentationDebug() {
  return {
    style: "arcade-heist",
    visibleRoomLabels: this.visibleRoomLabelCount,
    ambientLightCount: this.ambientLightCount,
    floorDetailCount: this.floorDetailCount,
    routeSignalMode: this.artifactsStolen === 0 ? "minimal" : "tactical"
  };
}
```

- [x] **Step 4: Run GREEN**

Run the same Playwright command and expect PASS.

### Task 2: Replace Schematic Room Labels With Arcade Art

**Files:**
- Modify: `apps/web/src/arcade/ArcadeHeistScene.ts`
- Modify: `apps/web/src/styles/global.css`
- Modify: `tests/e2e/play-now.spec.ts`

- [x] **Step 1: Write/adjust tests**

Update e2e localization and opening checks so the debug state no longer requires every room name to be visible. Keep zone beacon localization for functional markers:

```ts
expect(localizedArcade?.arenaLabels?.zoneBeacons).toEqual(expect.arrayContaining(["高价值", "撤离", "对手入口"]));
expect(localizedArcade?.worldPresentation?.visibleRoomLabels).toBeLessThanOrEqual(3);
```

- [x] **Step 2: Implement room art pass**

In `drawWorld` and `drawRoom`:
- Add ambient floor glows and floor panel lines before rooms.
- Draw corridor underlay, lane glow, and door pads.
- Only draw room text labels for critical rooms: `inner-vault`, `atrium`, and `vault-door`.
- Keep functional zone badges, but make them smaller and less dominant.
- Compress the opening contract HUD into a small job chip so the arena dominates the first screen.

- [x] **Step 3: Run targeted e2e**

Run:

```bash
pnpm exec playwright test tests/e2e/play-now.spec.ts -g "language picker|solo match starts and reaches final case file"
```

Expected: PASS.

### Task 3: Make The First Pickup Trigger Real Pressure

**Files:**
- Modify: `apps/web/src/arcade/ArcadeHeistScene.ts`
- Modify: `tests/e2e/play-now.spec.ts`

- [x] **Step 1: Add RED gameplay assertions**

After stealing the first relic in the solo match test, assert:

```ts
expect(afterSteal?.rivalsReleased).toBe(true);
expect(afterSteal?.rivalWakeHoldMs).toBeLessThanOrEqual(4_000);
expect(afterSteal?.worldPresentation?.routeSignalMode).toBe("tactical");
```

- [x] **Step 2: Implement faster pressure**

Reduce the post-pickup hold from “wait a long time” to a short cinematic beat:

```ts
this.releaseRivals({ announce: true, holdMs: 3_200 });
```

Ensure Rook hunter assignment and route/intel updates happen immediately after release.

- [x] **Step 3: Verify targeted gameplay**

Run:

```bash
pnpm exec playwright test tests/e2e/play-now.spec.ts -g "solo match starts and reaches final case file|rival intel cards"
```

Expected: PASS.

### Task 4: Full Verification And Ship

**Files:**
- No new production files beyond the scene/CSS/test/doc edits.

- [x] **Step 1: Run full local verification**

```bash
pnpm test
pnpm build
pnpm exec playwright test
git diff --check
```

Expected: all pass; Vite Phaser chunk warning is acceptable.

- [x] **Step 2: Visual smoke**

Open `http://127.0.0.1:8787/`, start `Play Now vs AI`, and confirm:
- opening has a cleaner top-down heist look,
- most room names are gone,
- route guidance remains readable,
- Red Crew pressure appears quickly after first pickup.

- [ ] **Step 3: Commit and merge**

```bash
git add docs/superpowers/plans/2026-06-10-arcade-heist-pivot.md apps/web/src/arcade/ArcadeHeistScene.ts apps/web/src/styles/global.css tests/e2e/play-now.spec.ts
git commit -m "Pivot arcade heist presentation"
git push -u origin feat/arcade-heist-pivot
gh pr create --title "Pivot arcade heist presentation" --body "..."
gh pr checks --watch
gh pr merge --merge --delete-branch
```

Expected: PR CI passes, merge completes, main CI and Pages pass.
