# Agent Alibi

Agent Alibi is a short online heist game where every seat can be human or AI. Bluff through six simultaneous-planning rounds, steal artifacts from the Moon Vault, cover teammates with alibis, and escape before the vault seals.

## What I made

I made a playable browser game with:

- Play Now vs AI solo mode.
- Create Room lobby with shareable room codes.
- AI seats with five personalities: Rook, Moth, Gremlin, Vesper, Anchor.
- One polished heist map: Moon Vault.
- Six-round deterministic game engine.
- Eight actions: Move, Scout, Steal, Distract, Guard, Sabotage, Cover, Escape.
- Fallback scripted bots, so the game works without an OpenAI API key.
- Optional server-side OpenAI decision hook.
- Final Agent Alibi case file with winner, MVP, betrayal, score, and replay-style summary.

## How Codex helped

Codex helped turn the game concept into a scoped MVP, design the deterministic game engine, implement legal action generation and round resolution, add fallback bot personalities, build the React game UI, create the Fastify/Socket.IO room flow, add an optional OpenAI decision schema, write tests and simulations, and prepare the README/deployment checklist.

## How to play / controls

Click **Play Now vs AI** for the fastest start.

Each round:

1. Read the AI briefing.
2. Pick one action.
3. Lock it.
4. Watch the reveal log update.
5. Steal artifacts and escape before round 6 ends.

Controls:

- Mouse or touch UI.
- No keyboard required.

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
