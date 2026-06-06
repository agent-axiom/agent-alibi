# Agent Alibi

Agent Alibi is a neon sci-fi heist game where every seat can be human or AI. The first-click experience is a live top-down Moon Vault run: move through the vault, steal lunar relics, decide whether to bank or gamble for greed, dodge rival agents, and cash out before lockdown.

Playable link: https://agent-axiom.github.io/agent-alibi/

## What I made

I made a playable browser game with:

- Play Now vs AI top-down arcade mode.
- WASD / arrow movement, dash, steal, alibi pulse, greed-route toggle, and touch controls.
- Dynamic music loops for menu, stealth, alarm, and lockdown, plus mission stingers.
- Rival AI agents that wake after the first score, steal relics, carry loot, and race for cashout.
- Clear objective markers, radar, route chevrons, carrier warnings, cashout stakes, and final case highlights.
- Create Room lobby with shareable room codes and the original round/card multiplayer layer.
- AI seats with five personalities: Rook, Moth, Gremlin, Vesper, Anchor.
- One polished heist map: Moon Vault.
- Six-round deterministic game engine.
- Eight actions: Move, Scout, Steal, Distract, Guard, Sabotage, Cover, Escape.
- Fallback scripted bots, so the game works without an OpenAI API key.
- Optional server-side OpenAI decision hook.
- Final Agent Alibi case file with winner, score margin, loot chain, cashout banked value, stolen relics, and shareable highlights.

## How Codex helped

Codex helped turn the game concept into a playable heist, design the deterministic engine, implement legal action generation and round resolution, add fallback bot personalities, build the React/Phaser arcade layer, create the Fastify/Socket.IO room flow, wire dynamic music and stingers, add optional OpenAI decision schemas, write unit/e2e/simulation tests, and prepare the README/deployment checklist.

## How to play / controls

Click **Play Now vs AI** for the fastest start.

In arcade mode:

1. Follow the gold marker to the current relic.
2. Steal it with `E` / `Space`.
3. Choose the safe cashout route or press `G` to arm the greed route.
4. Watch rival carriers and intercept them before they bank loot.
5. Reach the Atrium Lift and cash out before lockdown.

Create Room keeps the multiplayer planning mode: invite friends, fill empty seats with AI, lock one action per round, then watch the reveal.

Controls:

- Move: `WASD` or arrow keys.
- Steal / cashout / alibi pulse / intercept: `E` or `Space`.
- Dash: `Shift`.
- Toggle greed route: `G`.
- Sound: speaker button on Home or inside the arcade HUD.
- Touch: on-screen movement and action buttons.

## OpenAI API

OpenAI is optional. The game is fully playable with fallback bots.

If enabled, OpenAI runs server-side only. Do not put API keys in client code or commit `.env` files.

Environment variables:

```bash
OPENAI_API_KEY=
AI_DECISION_MODEL=gpt-4.1-mini
AI_NARRATOR_MODEL=gpt-4.1-mini
ENABLE_OPENAI=false
ENABLE_MODERATION=false
MAX_AI_PLAYERS_PER_ROOM=5
MAX_ROUNDS=6
AI_TIMEOUT_MS=6000
PORT=8787
```

## Local development

Use Node 20+.

```bash
corepack enable pnpm
pnpm install
pnpm dev
```

Open:

```text
http://127.0.0.1:5173
```

For production-like local serving:

```bash
pnpm --filter @agent-alibi/web build
pnpm start
```

Open:

```text
http://127.0.0.1:8787
```

## Tests

```bash
pnpm test
pnpm typecheck
pnpm --filter @agent-alibi/web build
pnpm exec playwright test
```

The game package includes a 100-match scripted simulation smoke test.

## Deployment

GitHub Pages hosts the static Play Now vs AI arcade build:

```text
https://agent-axiom.github.io/agent-alibi/
```

The `Pages` workflow builds `apps/web` with `AGENT_ALIBI_BASE_PATH=/agent-alibi/`, so Vite assets and public audio files resolve correctly under the repository subpath.

Recommended primary host: Railway or Render.

Build command:

```bash
pnpm install && pnpm --filter @agent-alibi/web build
```

Start command:

```bash
pnpm start
```

Set deployment environment variables in the host dashboard. Keep `ENABLE_OPENAI=false` unless a server-side `OPENAI_API_KEY` is configured.

itch.io can be used as a static showcase for the solo mode, but it is not the primary host for the realtime room server.

## No secrets

Do not commit API keys, `.env` files, tokens, private keys, or deployment secrets. The repo includes `.env.example` only.
