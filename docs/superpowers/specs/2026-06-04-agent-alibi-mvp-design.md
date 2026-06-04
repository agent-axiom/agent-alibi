# Agent Alibi MVP Design

## Goal

Build a short playable online heist game for the dev challenge. The entry must be easy to judge: open a link, click Play Now vs AI, finish a memorable match in 5-8 minutes, and understand what Codex helped build from the README.

The launch target is a polished MVP, not the full long-term platform. The MVP should be stable, replayable, and strong enough to submit with:

- public GitHub repo
- playable game link
- short description
- README with what was made, how Codex helped, and controls

## Product Hook

Agent Alibi is a cartoon sci-fi heist game where every seat can be human or AI. Players bluff through six simultaneous-planning rounds, steal absurd moon artifacts, cover teammates with alibis, and escape before the Moon Vault seals.

The memorable target moment:

1. The player clicks Play Now vs AI.
2. AI agents propose plans and lie in short public messages.
3. The player steals a major artifact.
4. An AI agent covers, betrays, or frames someone.
5. The final case file gives the match a funny title and shareable summary.

## MVP Scope

### Included

- One level: Moon Vault.
- Two teams.
- Two to six total slots.
- Slot types: human or AI.
- Three entry modes:
  - Play Now vs AI.
  - Create Room.
  - AI vs AI Demo.
- Six rounds per match.
- Round phases:
  - Briefing.
  - Lock actions.
  - Reveal.
- Eight actions:
  - Move.
  - Scout.
  - Steal.
  - Distract.
  - Guard.
  - Sabotage.
  - Cover.
  - Escape.
- Five AI profiles:
  - Rook: balanced strategist.
  - Moth: quiet scout.
  - Gremlin: chaotic risk-taker.
  - Vesper: smooth liar.
  - Anchor: loyal teammate.
- Scripted fallback bots that make the game fully playable without OpenAI.
- Optional server-side OpenAI decision calls controlled by environment variables.
- Deterministic game engine package for legal actions, resolution, scoring, and replay.
- Final case file with winner, MVP, biggest betrayal, suspicious player, score, and replay log.
- Local tests for game rules and full-match simulation.
- Playable deployment path for Railway or Render.
- Optional static itch.io showcase build later, not the primary online deployment.

### Not Included

- Accounts or login.
- Ranked matchmaking.
- More than one map.
- Campaign mode.
- Custom user-written agent prompts.
- Voice chat.
- Persistent database.
- Mobile native app.
- Level editor.
- Procedural maps.
- Long-term AI memory.
- Payment, economy, or progression.

## Gameplay Design

Moon Vault is a graph of rooms rather than a physics or tilemap level:

- Atrium.
- East Hall.
- Moon Gallery.
- Guard Post.
- West Hall.
- Silver Archive.
- Crystal Lift.
- Vault Door.
- Inner Vault.

The vault opens for six rounds. Alarm rises over time and from risky actions. Artifacts start in key rooms. Players collect loot and must escape through an exit before the match ends.

Scoring:

- +3 for a major artifact.
- +1 for a minor artifact.
- +2 for successful escape.
- +1 for saving or covering a teammate at a meaningful moment.
- -1 for being caught.
- -2 team penalty for active players left inside after the final round.

Resolution order is fixed:

1. Escape.
2. Move.
3. Scout.
4. Distract, Guard, and Sabotage.
5. Steal.
6. Cover and alibi effects.
7. Alarm update.
8. Caught checks.
9. Score and replay updates.

The server and local solo mode use the same resolver. The client never invents authoritative results.

## Architecture

Use a TypeScript monorepo:

```text
agent-alibi/
  apps/
    web/
      src/
        components/
        game-ui/
        lobby/
        socket/
        styles/
    server/
      src/
        index.ts
        rooms/
        sockets/
        ai/
        safety/
  packages/
    game/
      src/
        actions.ts
        legal-actions.ts
        map.ts
        reducer.ts
        resolver.ts
        scoring.ts
        simulation.ts
        state.ts
    shared/
      src/
        events.ts
        schemas.ts
        types.ts
    ai/
      src/
        build-observation.ts
        decision-schema.ts
        fallback-bots.ts
        openai-client.ts
  README.md
  .env.example
  package.json
  pnpm-workspace.yaml
```

Frontend:

- React + Vite.
- Dense game-first layout, not a marketing landing page.
- First screen exposes Play Now vs AI and Create Room.
- Match screen includes map, statusline, briefing/chat, action list, team panels, reveal log.
- Final screen shows a shareable case file.

Backend:

- Node + Fastify + Socket.IO.
- In-memory rooms for MVP.
- Serves the built web app in production.
- Stores OpenAI keys only in server-side environment variables.
- Can run with OpenAI disabled.

Core game:

- Pure deterministic package.
- No React, sockets, or OpenAI dependencies.
- Main shape: `resolveRound(previousState, lockedActions, rngSeed)`.
- Replays are derived from resolver events.

## Realtime Flow

Client events:

- `room:create`
- `room:join`
- `slot:add_ai`
- `slot:remove_ai`
- `match:start`
- `chat:send`
- `action:lock`
- `action:unlock`

Server events:

- `room:state`
- `match:state`
- `round:briefing_started`
- `ai:thinking`
- `player:locked`
- `round:revealed`
- `match:finished`
- `error`

Public match state excludes hidden or future-only information. Locked actions are not revealed until the reveal phase.

## AI Design

The model suggests. The server validates. The game engine resolves.

AI receives:

- player identity and profile
- public match state
- recent events
- legal action list with IDs

AI returns:

- short public message
- chosen legal action ID
- short intent summary
- confidence

The server validates the chosen action ID against the legal action list. Invalid, slow, failed, or disabled OpenAI decisions fall back to scripted bots.

No custom user system prompts are allowed in MVP. Names and chat are length-limited and sanitized. Moderation can be enabled server-side, but the MVP must remain playable without OpenAI moderation.

Environment variables:

```text
OPENAI_API_KEY=
AI_DECISION_MODEL=
AI_NARRATOR_MODEL=
ENABLE_OPENAI=false
ENABLE_MODERATION=false
MAX_AI_PLAYERS_PER_ROOM=5
MAX_ROUNDS=6
AI_TIMEOUT_MS=6000
```

## Deployment

Primary deployment should be Railway or Render as a single Node service:

- builds packages and web app
- starts the Fastify/Socket.IO server
- serves frontend assets
- keeps OpenAI API key in deployment secrets

itch.io is optional as a static showcase or offline demo. It is not the primary host because it cannot run the realtime backend.

## Testing

Minimum verification:

- unit tests for legal action generation
- unit tests for round resolution
- unit tests for scoring
- unit tests for AI decision schema validation
- full six-round scripted bot simulation
- 100-match AI-vs-AI simulation smoke
- frontend build
- Playwright smoke: Play Now vs AI, lock actions, finish match

The game is not complete until a solo match can finish locally without OpenAI.

## README Requirements

README must include:

- what was made
- how Codex helped
- how to play and controls
- OpenAI API note
- local development
- deployment
- no-secrets warning

README should also include a screenshot or GIF before final submission if time allows.

## Success Criteria

- A judge can play immediately without login or friends.
- The first solo match completes without backend failures or OpenAI credentials.
- The final case file is funny and shareable.
- Online room creation works in local development.
- The repo is public and does not contain secrets.
- README satisfies the challenge requirements.
