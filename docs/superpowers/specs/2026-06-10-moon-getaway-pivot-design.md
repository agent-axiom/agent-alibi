# Moon Getaway Pivot Design

## Goal

Replace the current room-map arcade presentation with a playable, immediately readable top-down getaway game. The first playable mode should feel closer to a compact GTA 1/2-style sci-fi chase than a diagram of rooms.

## Research Basis

The pivot is based on current game feel and usability principles:

- Game feel depends on responsive control, meaningful movement context, and audiovisual polish.
- Impact feedback is strongly shaped by camera control, sound coherence, and brief action emphasis.
- UI should minimize visible text, favor recognition over recall, and reveal complexity progressively.

Reference sources:

- Designing Game Feel: A Survey: https://arxiv.org/abs/2011.09201
- Impact feedback in action games: https://arxiv.org/abs/2208.06155
- Game feel overview and references: https://en.wikipedia.org/wiki/Game_feel
- NN/g 10 usability heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g progressive disclosure: https://www.nngroup.com/articles/progressive-disclosure/

## Product Direction

Working title: Agent Alibi: Moon Getaway.

The player is dropped into a continuous moon-base arena, not a graph of rooms. They drive/hover an agent craft through lanes, break a gate, grab the Moon Pearl, dodge patrol beams, outrun rival agents, and reach an extraction pad. The goal is readable through motion and color rather than explanation.

## First 10 Seconds

The player should see:

- A full-screen moon-base roadway/landing platform.
- The player hover-agent in the lower third.
- A large glowing Moon Pearl ahead.
- A gold route arrow/racing line.
- A green extraction beacon in the distance.
- A small top-right timer/sound chip.
- One bottom chip: `Steal +3`.

The player should not see:

- Room labels.
- Card panels.
- Contract chains.
- Long instructions.
- Multiple competing HUD modules.

## Core Loop

One run lasts 90-150 seconds.

1. Launch from breach zone.
2. Follow the gold racing line to the relic.
3. Pick up or tap interact at the relic.
4. Alarm drops in: red wash, rival craft launch, music/stinger pressure.
5. Choose route by movement: green extraction lane or gold greed lane.
6. Use dash and alibi pulse to break pursuit.
7. Escape through extraction pad or get caught/sealed.
8. Show final case file.

## Controls

- WASD / arrow keys: steer the hover-agent.
- Shift: dash.
- E / Space: interact if near relic, gate, or extraction.
- Touch d-pad/action buttons remain icon-only.

Movement must feel more like a nimble hover-car than a token:

- Acceleration and drift.
- Facing direction.
- Trail and speed streaks.
- Short camera lead toward velocity/objective.
- Generous pickup/extraction radii.

## Visual Design

The playfield is a continuous lunar facility:

- Curved roads and landing pads, not room cards.
- Crater edges, glass rails, antennae, hangar doors, hazard strips.
- Gold route lanes for loot, green lanes for extraction, red cones for patrol/rivals.
- Relics are large readable pickups with value labels.
- Rivals are red hover-craft with streaks and simple name chips only when close.

The scene can be drawn procedurally in Phaser using graphics primitives for the first pivot. No new asset pipeline is required.

## HUD Design

React should become a minimal shell over the canvas:

- Top-right: timer and sound.
- Bottom-center: current action chip.
- Rare center overlays only for `CHASE`, `ALIBI +2`, `CASHOUT +N`, or final countdown.
- Touch controls stay in corners.

Everything else should be in-world.

## AI Rival Behavior

For this pivot, rivals are scripted but readable:

- They launch after first theft.
- One pursues the player.
- One tries to steal a second relic and flee.
- They can raise pressure but cannot create confusing hidden rules.

OpenAI personalities remain future flavor, not required for moment-to-moment action.

## Technical Design

Create a new scene rather than continuing to inflate `ArcadeHeistScene`:

- `apps/web/src/getaway/MoonGetawayScene.ts`: Phaser scene for movement, roads, relic, rivals, extraction, debug state.
- `apps/web/src/getaway/MoonGetawayStage.tsx`: React wrapper with the same mission config shape used by the existing arcade stage.
- `apps/web/src/getaway/getaway-types.ts`: debug and lightweight HUD types specific to the new scene.
- `apps/web/src/game-ui/MatchScreen.tsx`: use Moon Getaway for local Play Now arcade mode.
- `apps/web/src/styles/global.css`: minimal `getaway-*` overlay styles.

Keep existing final case file, music selector, local match controller, i18n, and sound toggle.

## Testing

Unit tests:

- Pure route/objective helper returns `steal`, then `escape`, then `finished`.
- Score helper maps escaped/caught runs to an `ArcadeMissionResult` compatible with final case file.

Playwright tests:

- Play Now opens Moon Getaway stage.
- Opening visible text is under a strict threshold.
- Canvas screenshot is nonblank and high contrast.
- Debug state reports `mode: moon-getaway`, `mapStyle: continuous-roadway`, `roomLabels: 0`.
- Player moves with arrow keys.
- Debug teleport to relic, interact, chase starts.
- Debug teleport to extraction, interact, final case file appears.
- Mobile controls do not overlap the bottom action chip.

## Success Criteria

The pivot is successful when:

- The first screen no longer resembles a graph/room map.
- The player goal is visible without reading paragraphs.
- Movement and chase read as action, not planning UI.
- Local tests, build, Playwright, and GitHub CI pass.
- The public GitHub Pages build deploys successfully.

## Non-Goals

Not in this pass:

- Online real-time multiplayer rewrite.
- Procedural city generation.
- Combat/weapons.
- New asset packs.
- Custom AI prompts.
