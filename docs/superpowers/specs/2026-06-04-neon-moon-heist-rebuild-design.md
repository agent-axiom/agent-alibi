# Neon Moon Heist Rebuild Design

## Decision

Rebuild Agent Alibi as a cinematic sci-fi heist tactics game instead of a text-heavy board UI.

The current MVP proves the room flow, deterministic rules, fallback agents, and tests. It does not feel like a game: the match screen is a map diagram plus too many buttons. This rebuild keeps the useful engine and AI pieces, but replaces the player experience.

## Product Goal

The first playable experience should make a judge think:

1. I clicked Play Now.
2. I saw a living lunar vault, not an admin panel.
3. I chose a small crew plan quickly.
4. Agents executed the plan in a short animated heist beat.
5. Someone stole, covered, lied, sabotaged, or got exposed.
6. The final case file felt worth sharing.

## Core Experience

Name: Agent Alibi: Neon Moon Heist

Mode for the first rebuild slice:

- Solo vs AI only.
- One heist: Moon Vault.
- Six rounds.
- Four agents on screen: the human agent plus three AI agents.
- Each round has two phases:
  - Plan: choose one active agent and one of three contextual action cards.
  - Execute: watch a short animated scene where all agents move, steal, cover, sabotage, or escape.

The player should never see a long list of legal actions. The UI should show a small number of meaningful choices.

## Visual Direction

The match screen is a full-screen sci-fi scene:

- Neon lunar vault floor.
- Animated agents with portraits, names, team colors, and status rings.
- Laser sweeps, alarm pulses, vault doors, artifact glow, sabotage sparks.
- A compact HUD, not panels everywhere.
- Radio feed for agent speech.
- Big cinematic reveal captions for important moments.

The scene should be visually understandable without reading instructions.

## Interaction Model

Controls:

- Mouse/touch only for MVP.
- Click an agent portrait or agent token.
- Choose one of three action cards.
- Click Execute.

Round UI:

- Left/top: crew portraits.
- Center: Phaser heist scene.
- Bottom: three large contextual action cards.
- Right or lower corner: compact radio feed.
- Alarm shown as a cinematic vault meter, not a table.

Action cards should be generated from legal actions but grouped and ranked:

- Primary objective action: steal, move toward loot, escape if urgent.
- Social action: cover, distract, frame, lie.
- Risk action: sabotage, rush, risky steal, decoy.

## Game Feel

The game should prioritize readable drama over strategic completeness.

Every round needs at least one memorable beat:

- Artifact taken.
- Route blocked.
- Agent covered by an alibi.
- Agent framed.
- Laser sweep raises alarm.
- Agent barely escapes.

If nothing dramatic happens, the narrator/reveal layer should still present movement and intent with style.

## AI Agents

Keep the five existing archetypes:

- Rook: strategist.
- Moth: scout.
- Gremlin: chaotic saboteur.
- Vesper: liar.
- Anchor: loyal cover agent.

For this rebuild:

- Fallback bots remain mandatory.
- OpenAI remains optional and server-side only.
- AI still selects from legal action IDs.
- AI speech appears in the radio feed.
- The AI cannot directly mutate game state.

OpenAI decision calls are outside the first rebuild slice. The slice must feel playable and characterful with fallback bots alone.

## Technical Architecture

Use Phaser 3 for the playable scene inside the existing Vite React app.

Recommended structure:

- `apps/web/src/heist/`
  - Phaser scene setup.
  - Agent sprites/tokens.
  - Laser/alarm/artifact effects.
  - Animation timeline from reveal events.
- `apps/web/src/game-ui/`
  - React HUD.
  - Agent portraits.
  - Action cards.
  - Radio feed.
  - Final case file.
- `packages/game/`
  - Keep deterministic state, legal actions, resolver, scoring.
  - Add presentation-friendly event metadata only when Phaser cannot infer an animation from existing reveal events.
- `packages/ai/`
  - Keep fallback decisions and optional OpenAI decision schema.

React owns state and round progression. Phaser owns rendering and animation. The bridge is one-way for execution:

1. React computes public state and available action cards.
2. Player locks one action.
3. Engine resolves the round.
4. React sends previous state, next state, and reveal events to Phaser.
5. Phaser plays the cinematic timeline.
6. React unlocks the next planning phase.

## First Vertical Slice

The first rebuild must include:

- New Play Now flow that opens directly into the cinematic match.
- Full-screen Phaser Moon Vault scene.
- Four animated agent tokens.
- Artifact pickups rendered visually.
- Alarm/laser animation.
- Three contextual action cards.
- Execute button.
- Radio feed with AI lines.
- Reveal captions.
- Final case file screen.
- Playwright smoke test that starts solo mode, executes rounds, and reaches final case file.

## Non-Goals

Do not build in the first rebuild slice:

- Real-time WASD stealth.
- Multiplayer room redesign.
- Custom agent prompts.
- Accounts or login.
- Ranked modes.
- Level editor.
- Procedural maps.
- Complex inventory UI.
- Long action lists.

## Testing

Required checks:

- Unit tests for action card grouping/ranking.
- Existing game engine tests still pass.
- Existing AI fallback tests still pass.
- Playwright smoke test for solo flow.
- Browser visual verification screenshot on desktop.
- Basic mobile viewport check that text does not overlap.

## Acceptance Criteria

The rebuild is acceptable only if:

- The first match screen does not look like a dashboard.
- There are never more than three primary action cards visible.
- The game can be played without reading the README.
- A first-time player can finish a solo match in under 6 minutes.
- The scene has visible motion after every Execute.
- The final screen creates a shareable story, not only a score table.
