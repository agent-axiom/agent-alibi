# Agent Alibi MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable Agent Alibi MVP with a deterministic Moon Vault game loop, solo vs AI, room-ready architecture, fallback bots, optional server-side OpenAI, and submission-ready docs.

**Architecture:** TypeScript monorepo with pure game logic in `packages/game`, shared schemas in `packages/shared`, fallback/AI helpers in `packages/ai`, React/Vite UI in `apps/web`, and Fastify/Socket.IO server in `apps/server`. The first shippable vertical slice is local solo vs scripted AI; online rooms and OpenAI are layered on top without changing the core resolver.

**Tech Stack:** TypeScript, pnpm workspaces, Vite, React, Vitest, Fastify, Socket.IO, Zod, OpenAI SDK, Playwright.

---

## File Structure

- `package.json`: root scripts for build, dev, test, lint, server, web.
- `pnpm-workspace.yaml`: workspace package list.
- `tsconfig.base.json`: shared TypeScript compiler options.
- `.gitignore`: excludes dependencies, build output, env files, keys.
- `.env.example`: server-side OpenAI and game config variables.
- `packages/shared/src/types.ts`: public shared domain types.
- `packages/shared/src/events.ts`: socket event type definitions.
- `packages/shared/src/schemas.ts`: Zod schemas for runtime validation.
- `packages/game/src/state.ts`: `GameState`, initial state helpers.
- `packages/game/src/map.ts`: Moon Vault map and content.
- `packages/game/src/actions.ts`: action IDs and action constructors.
- `packages/game/src/legal-actions.ts`: legal action generator.
- `packages/game/src/resolver.ts`: deterministic round resolution.
- `packages/game/src/scoring.ts`: score and final summary.
- `packages/game/src/simulation.ts`: scripted full-match simulation helper.
- `packages/game/src/*.test.ts`: unit and simulation tests.
- `packages/ai/src/profiles.ts`: five AI personalities.
- `packages/ai/src/fallback-bots.ts`: deterministic bot decisions and messages.
- `packages/ai/src/decision-schema.ts`: structured AI response schema.
- `packages/ai/src/build-observation.ts`: model-visible observation builder.
- `packages/ai/src/openai-client.ts`: optional OpenAI decision wrapper with timeout.
- `apps/web/src/App.tsx`: screen routing and game shell.
- `apps/web/src/game-ui/*`: match UI components.
- `apps/web/src/lobby/*`: home and room screens.
- `apps/web/src/local/*`: local solo match controller.
- `apps/web/src/socket/*`: Socket.IO client wrapper.
- `apps/web/src/styles/*`: global styles.
- `apps/server/src/index.ts`: Fastify + Socket.IO entrypoint.
- `apps/server/src/rooms/*`: in-memory room manager.
- `apps/server/src/ai/*`: server AI service.
- `apps/server/src/safety/*`: string trimming and sanitization.
- `README.md`: challenge-ready instructions.
- `tests/e2e/play-now.spec.ts`: Playwright smoke test.

---

### Task 1: Workspace Scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `apps/web/package.json`
- Create: `apps/server/package.json`
- Create: `packages/game/package.json`
- Create: `packages/shared/package.json`
- Create: `packages/ai/package.json`

- [ ] **Step 1: Create root package files**

Create root scripts:

```json
{
  "name": "agent-alibi",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "pnpm --parallel --filter @agent-alibi/web --filter @agent-alibi/server dev",
    "dev:web": "pnpm --filter @agent-alibi/web dev",
    "dev:server": "pnpm --filter @agent-alibi/server dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "test:game": "pnpm --filter @agent-alibi/game test",
    "smoke": "pnpm --filter @agent-alibi/web build && pnpm playwright test",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "@playwright/test": "^1.44.0",
    "typescript": "^5.5.0"
  }
}
```

Workspace:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Shared TS config:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true
  }
}
```

- [ ] **Step 2: Create app and package manifests**

Use these package names:

```text
@agent-alibi/web
@agent-alibi/server
@agent-alibi/game
@agent-alibi/shared
@agent-alibi/ai
```

Web dependencies:

```text
@vitejs/plugin-react vite react react-dom lucide-react socket.io-client
```

Server dependencies:

```text
fastify @fastify/static socket.io zod openai dotenv
```

Package/test dependencies:

```text
vitest zod
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
pnpm install
```

Expected: lockfile created and no dependency resolution errors.

- [ ] **Step 4: Commit scaffold**

```bash
git add .
git commit -m "chore: scaffold Agent Alibi workspace"
```

---

### Task 2: Shared Types and Moon Vault Content

**Files:**
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/events.ts`
- Create: `packages/shared/src/schemas.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/game/src/map.ts`
- Create: `packages/game/src/state.ts`
- Create: `packages/game/src/index.ts`

- [ ] **Step 1: Define shared types**

Add stable IDs and public state types:

```ts
export type TeamId = "blue" | "red";
export type PlayerKind = "human" | "ai";
export type PlayerStatus = "active" | "escaped" | "caught";
export type RoundPhase = "briefing" | "locking" | "revealing" | "finished";

export type PlayerState = {
  id: string;
  kind: PlayerKind;
  name: string;
  teamId: TeamId;
  locationId: string;
  status: PlayerStatus;
  suspicion: number;
  inventory: string[];
  agentProfileId?: string;
};

export type ArtifactState = {
  id: string;
  name: string;
  roomId: string;
  value: number;
  size: "minor" | "major";
  takenBy?: string;
};

export type Room = {
  id: string;
  name: string;
  x: number;
  y: number;
  danger: number;
};

export type MapEdge = {
  from: string;
  to: string;
  blockedRounds: number;
};

export type GameState = {
  matchId: string;
  phase: RoundPhase;
  round: number;
  maxRounds: number;
  rngSeed: string;
  rooms: Room[];
  edges: MapEdge[];
  exits: string[];
  players: PlayerState[];
  artifacts: ArtifactState[];
  alarm: number;
  revealLog: RevealEvent[];
};

export type RevealEvent = {
  id: string;
  round: number;
  tone: "info" | "success" | "danger" | "betrayal";
  text: string;
  playerIds?: string[];
};
```

- [ ] **Step 2: Define Moon Vault**

Add rooms, edges, exits, and artifacts matching the design spec. Major artifacts: `Moon Pearl`, `Argent Crown`. Minor artifacts: `Silver Key`, `Crystal Ledger`, `Star Map`.

- [ ] **Step 3: Add initial state helper**

Add `createInitialGameState(options)` with default four-player solo setup:

```ts
createInitialGameState({
  matchId: "local-demo",
  humanPlayerName: "Agent You",
  aiProfileIds: ["rook", "gremlin", "vesper"],
  seed: "demo-seed"
});
```

- [ ] **Step 4: Typecheck package**

Run:

```bash
pnpm --filter @agent-alibi/game typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit content foundation**

```bash
git add packages
git commit -m "feat: add Moon Vault state model"
```

---

### Task 3: Legal Actions and Resolver

**Files:**
- Create: `packages/game/src/actions.ts`
- Create: `packages/game/src/legal-actions.ts`
- Create: `packages/game/src/resolver.ts`
- Create: `packages/game/src/scoring.ts`
- Create: `packages/game/src/legal-actions.test.ts`
- Create: `packages/game/src/resolver.test.ts`
- Create: `packages/game/src/scoring.test.ts`

- [ ] **Step 1: Write failing legal action tests**

Test active player in Atrium can move, scout, guard, and cover teammates, but cannot steal if no artifact is present and cannot escape from a non-exit room.

- [ ] **Step 2: Implement legal action generator**

Generate action records with shape:

```ts
export type LegalAction = {
  id: string;
  label: string;
  kind: "move" | "scout" | "steal" | "distract" | "guard" | "sabotage" | "cover" | "escape";
  risk: "low" | "medium" | "high";
  actorId: string;
  payload: Record<string, string>;
};
```

- [ ] **Step 3: Write failing resolver tests**

Cover:

- movement to adjacent room
- steal available artifact
- simultaneous steal resolves once
- cover lowers suspicion
- sabotage blocks an edge for one round
- final round catches active players left inside

- [ ] **Step 4: Implement resolver**

Implement `resolveRound(state, lockedActions, seed)` with fixed resolution order from the spec. Return `{ state, events }`.

- [ ] **Step 5: Write scoring tests**

Assert artifact, escape, caught, and final-left-inside scoring.

- [ ] **Step 6: Implement scoring**

Add `getTeamScores(state)` and `buildMatchSummary(state)`.

- [ ] **Step 7: Run tests**

```bash
pnpm --filter @agent-alibi/game test
```

Expected: PASS.

- [ ] **Step 8: Commit game engine**

```bash
git add packages/game packages/shared
git commit -m "feat: implement deterministic heist resolver"
```

---

### Task 4: AI Profiles, Fallback Bots, and Simulation

**Files:**
- Create: `packages/ai/src/profiles.ts`
- Create: `packages/ai/src/fallback-bots.ts`
- Create: `packages/ai/src/decision-schema.ts`
- Create: `packages/ai/src/build-observation.ts`
- Create: `packages/ai/src/index.ts`
- Create: `packages/ai/src/fallback-bots.test.ts`
- Create: `packages/game/src/simulation.ts`
- Create: `packages/game/src/simulation.test.ts`

- [ ] **Step 1: Add AI profiles**

Profiles: Rook, Moth, Gremlin, Vesper, Anchor. Include archetype, risk tolerance, teamwork, deception, and speech style.

- [ ] **Step 2: Write fallback bot tests**

Assert:

- bot always returns a legal action ID
- Gremlin prefers sabotage or high-risk steal when available
- Anchor prefers cover when a teammate has suspicion
- bots emit public messages under 180 characters

- [ ] **Step 3: Implement fallback bot decisions**

Use deterministic scoring over legal actions. No randomness unless seeded.

- [ ] **Step 4: Add AI decision schema**

Use Zod:

```ts
chosenActionId: string
publicMessage: string max 180
intentSummary: string max 240
confidence: "low" | "medium" | "high"
```

- [ ] **Step 5: Add full-match simulation**

`runScriptedMatch(seed)` should create a match, lock bot actions until round six, and return final state and summary.

- [ ] **Step 6: Add 100-match smoke test**

Assert every simulated match reaches `finished`, scores are finite, and no player references invalid room IDs.

- [ ] **Step 7: Run AI and game tests**

```bash
pnpm --filter @agent-alibi/ai test
pnpm --filter @agent-alibi/game test
```

Expected: PASS.

- [ ] **Step 8: Commit AI fallback layer**

```bash
git add packages
git commit -m "feat: add AI profiles and fallback bots"
```

---

### Task 5: Playable Solo React UI

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/local/useLocalMatch.ts`
- Create: `apps/web/src/lobby/HomeScreen.tsx`
- Create: `apps/web/src/game-ui/StatusLine.tsx`
- Create: `apps/web/src/game-ui/MoonVaultMap.tsx`
- Create: `apps/web/src/game-ui/ActionPanel.tsx`
- Create: `apps/web/src/game-ui/BriefingPanel.tsx`
- Create: `apps/web/src/game-ui/TeamPanel.tsx`
- Create: `apps/web/src/game-ui/RevealLog.tsx`
- Create: `apps/web/src/game-ui/FinalCaseFile.tsx`
- Create: `apps/web/src/styles/global.css`

- [ ] **Step 1: Build local match controller**

`useLocalMatch` owns local state, starts solo vs AI, gets legal actions for the human, locks a human action, asks fallback bots for AI actions, resolves the round, and finishes after six rounds.

- [ ] **Step 2: Implement home screen**

First viewport must be the game UI entry, not a marketing page. Include two primary controls: Play Now vs AI and Create Room.

- [ ] **Step 3: Implement match screen**

Show:

- Round and alarm statusline.
- SVG room graph with player and artifact chips.
- Public AI briefing messages.
- Legal action buttons.
- Team scores.
- Reveal log.

- [ ] **Step 4: Implement final case file**

Show winner, MVP, biggest betrayal, most suspicious, title, scores, Copy Result, Rematch.

- [ ] **Step 5: Add responsive CSS**

Use stable panel sizes, no nested cards, no dark-blue-only palette, no text overflow in buttons.

- [ ] **Step 6: Build web app**

```bash
pnpm --filter @agent-alibi/web build
```

Expected: PASS.

- [ ] **Step 7: Commit solo UI**

```bash
git add apps/web packages
git commit -m "feat: build playable solo heist UI"
```

---

### Task 6: Fastify and Socket.IO Rooms

**Files:**
- Create: `apps/server/src/index.ts`
- Create: `apps/server/src/rooms/RoomManager.ts`
- Create: `apps/server/src/rooms/types.ts`
- Create: `apps/server/src/sockets/events.ts`
- Create: `apps/server/src/safety/sanitize.ts`
- Create: `apps/web/src/socket/client.ts`
- Create: `apps/web/src/lobby/RoomScreen.tsx`

- [ ] **Step 1: Implement server startup**

Fastify exposes `/health`, serves built web assets in production, and attaches Socket.IO.

- [ ] **Step 2: Implement RoomManager**

Support create room, join room, add AI, remove AI, start match, lock action, resolve round.

- [ ] **Step 3: Add socket handlers**

Validate client payloads with shared Zod schemas. Emit public room and match state.

- [ ] **Step 4: Add reconnect-lite**

Allow the same browser to rejoin by local player ID stored in localStorage.

- [ ] **Step 5: Wire basic room UI**

Create Room enters a room screen with invite code, slots, Add AI, Start Match.

- [ ] **Step 6: Run server and web typechecks**

```bash
pnpm --filter @agent-alibi/server typecheck
pnpm --filter @agent-alibi/web typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit online rooms**

```bash
git add apps packages
git commit -m "feat: add realtime room flow"
```

---

### Task 7: Optional OpenAI Decision Service

**Files:**
- Create: `packages/ai/src/openai-client.ts`
- Create: `apps/server/src/ai/AIService.ts`
- Modify: `apps/server/src/rooms/RoomManager.ts`
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Implement timeout wrapper**

OpenAI calls must resolve or fall back within `AI_TIMEOUT_MS`, default 6000.

- [ ] **Step 2: Implement OpenAI decision wrapper**

Only call OpenAI when `ENABLE_OPENAI=true` and `OPENAI_API_KEY` is set. Parse with `decision-schema.ts`; reject invalid action IDs.

- [ ] **Step 3: Integrate AIService**

RoomManager uses OpenAI for AI slots when enabled, otherwise fallback bots. Any error emits normal fallback results, not a broken match.

- [ ] **Step 4: Run schema tests**

```bash
pnpm --filter @agent-alibi/ai test
```

Expected: PASS without API key.

- [ ] **Step 5: Commit OpenAI hook**

```bash
git add apps packages .env.example README.md
git commit -m "feat: add optional OpenAI agent decisions"
```

---

### Task 8: Submission Polish, README, and Smoke Tests

**Files:**
- Create: `README.md`
- Create: `playwright.config.ts`
- Create: `tests/e2e/play-now.spec.ts`
- Modify: `apps/web/src/game-ui/*`
- Modify: `apps/web/src/styles/global.css`
- Modify: `apps/server/src/index.ts`
- Modify: `package.json`

- [ ] **Step 1: Write README**

Include exact challenge sections:

- What I made.
- How Codex helped.
- How to play / controls.
- OpenAI API.
- Local development.
- Deployment.
- No secrets note.

- [ ] **Step 2: Add Playwright smoke**

Test:

1. Open home.
2. Click Play Now vs AI.
3. Select and lock actions until match finishes.
4. Assert final case file appears.

- [ ] **Step 3: Polish game feel**

Add reveal pacing, clear selected action state, statusline copy, and final case file copy text.

- [ ] **Step 4: Run full verification**

```bash
pnpm test
pnpm build
pnpm smoke
```

Expected: all pass.

- [ ] **Step 5: Commit submission polish**

```bash
git add .
git commit -m "chore: prepare Agent Alibi submission"
```

---

## Self-Review

- Spec coverage: The plan covers Moon Vault, solo vs AI, room links, fallback bots, optional OpenAI, final case file, tests, README, and Railway/Render deployment readiness.
- Scope: The plan intentionally excludes accounts, ranked, extra maps, campaign, editor, progression, and custom prompts.
- Type consistency: Core names use `GameState`, `PlayerState`, `LegalAction`, `resolveRound`, `runScriptedMatch`, and `buildMatchSummary` throughout.
- Placeholder scan: No task relies on an undefined future system; optional itch.io is not in the implementation path.
