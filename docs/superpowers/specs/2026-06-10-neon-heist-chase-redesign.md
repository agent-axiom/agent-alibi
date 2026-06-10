# Neon Heist Chase Redesign Design

## Goal

Rebuild Agent Alibi's first playable experience into a fast, readable, top-down sci-fi heist chase that feels good in the first 30 seconds. The game should be attractive before the player understands every system, and understandable before the player reads any instructions.

## UX Principles

This redesign follows five principles from current usability and game-feel research:

- Minimal visible text: every extra label competes with the game state the player needs now.
- Recognition over recall: the player should follow strong visual signals instead of remembering rules.
- Progressive disclosure: advanced systems appear only after the first successful theft.
- Immediate feedback: movement, pickups, dash, chase, danger, and extraction all need visual/audio impact.
- Flow: the player gets one clear goal, instant feedback, and escalating pressure instead of a dense control surface.

Reference sources used for the redesign direction:

- NN/g 10 Usability Heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/
- NN/g Progressive Disclosure: https://www.nngroup.com/articles/progressive-disclosure/
- Game Accessibility Guidelines: https://gameaccessibilityguidelines.com/full-list/
- Designing Game Feel survey: https://arxiv.org/abs/2011.09201
- Flow theory summary: https://en.wikipedia.org/wiki/Flow_%28psychology%29

## Player Promise

The player clicks Play Now vs AI and immediately sees a neon moon vault from above. They move like a small hover-agent, follow a glowing route to the Moon Pearl, steal it, trigger an alarm drop, outrun AI rivals, choose whether to cash out or risk another relic, and escape through a bright extraction gate.

The player should understand the first run through visual language:

- Gold means loot and route.
- Green means extraction and safety.
- Red means rivals, lasers, danger, and chase pressure.
- Blue/cyan means the player and alibi pulse.
- Big motion beats matter more than written instructions.

## Product Direction

The first playable mode becomes `Neon Heist Chase`, a GTA 1/2-lite arcade heist rather than a text-forward tactics game.

Keep:

- Agent Alibi brand, Moon Vault fantasy, AI rival personalities, final case file, localization, music, existing deploy/test workflow.
- Current React shell, Phaser scene wrapper, sound toggle, final screen, and debug hooks where useful.

Replace or heavily simplify:

- Debug-like map squares.
- Persistent dense HUD modules.
- Room labels as the primary orientation layer.
- Long tutorial copy.
- Abstract button-heavy gameplay.

## Core Loop

A single run is 2-3 minutes.

1. Spawn in the Moon Vault breach zone.
2. Follow the gold route to the first relic.
3. Steal on contact or quick interact.
4. Alarm drops in: screen pulse, music shift, rival launch, camera kick.
5. Choose visually between cashout gate and greed route.
6. Use dash and alibi pulse to break lock-on.
7. Escape or get sealed/caught.
8. See a punchy case file with score, rank, best moment, and replay/share copy.

## First 30 Seconds

The opening view must contain almost no interface text:

- Top-right: timer and sound only.
- Near target: `+3` loot marker.
- Near player: short movement affordance only if idle for several seconds.
- No visible room list, no contract block, no briefing wall, no multi-panel HUD.

The scene itself carries instruction:

- Player starts already facing the route.
- The route is animated and directional.
- The first relic is visible or strongly signposted.
- The camera gives mild lookahead toward the objective.
- The first rival stays inactive until the first theft, so the player gets a clean opening success.

## Gameplay Systems

### Movement

Movement stays simple: WASD/arrow keys, touch d-pad, dash button, interact button. The agent should feel like a nimble hover-car rather than a board-game token:

- Acceleration/easing on starts and stops.
- Clear facing direction.
- Dash trail and brief speed lines.
- Small collision forgiveness near pickups and exits.

### Loot

Artifacts become large, readable, animated pickups with value-first labels:

- Moon Pearl: first safe target, +3.
- Argent Crown: greed target, +3 or +4.
- Eclipse Key: optional route unlock, +2 and opens shortcut.

Picking up loot triggers visible score popups, route retargeting, and music pressure.

### Rivals

AI rivals should read as active characters without requiring text panels:

- Red silhouettes with name chips only when nearby or acting.
- One rival can steal a relic and run to extraction.
- One rival can lock onto the player during chase.
- Rival barks appear as very short comic bubbles, not paragraphs.

### Alibi Pulse

The signature mechanic becomes an arcade defensive move:

- Pulse key/action creates a cyan decoy burst.
- It breaks rival lock-on for a short window.
- It can convert a near catch into a score bonus.
- It is explained through use: icon cooldown, pulse effect, `ALIBI +2` popup.

### Cashout Choice

After the first relic, the player sees a fork, not a menu:

- Green extraction lane: safe cashout now.
- Gold greed lane: next relic for higher score.
- The current selected route can be toggled, but both lanes are visible in-world.

## Visual Direction

The target look is polished neon sci-fi arcade, not schematic strategy board.

Scene art:

- Full-screen playfield.
- Dark lunar-metal floor with parallax panel lines, glass vault rings, hazard beams, animated doors, and extraction pads.
- Corridors feel like roads/lanes, not graph edges.
- Rooms are implied by architecture, light, and gates, not text boxes.

HUD:

- Use compact chips and icons.
- No nested cards during gameplay.
- Avoid beige/cream, one-hue purple, and card-heavy dashboard layouts.
- Text inside gameplay UI must fit on mobile and desktop.

Animation and juice:

- Pickup burst.
- Alarm screen pulse.
- Camera kick on steal, dash, lock break, extraction.
- Rival arrival streaks.
- Extraction beam and countdown rings.
- Final case file transition with the player's best moment.

## Audio Direction

The four existing tracks are used as state music:

- `agent_alibi_main_loop.mp3`: menu and final idle.
- stealth loop: opening and low pressure.
- alarm loop: after first steal or rival pressure.
- lockdown loop: final seconds, active lock-on, or extraction crisis.

Sound must remain optional and browser-safe. Playback starts after user gesture. Music crossfades; it should never hard restart every state tick.

## Localization

The game keeps EN default plus RU and ZH. Gameplay text is intentionally tiny, so localization scope is small:

- Home buttons and final case file.
- Short action labels: steal, escape, alibi, dash, caught, sealed.
- Short popups and route labels.
- Accessibility labels for controls.

The canvas debug state should expose localized labels where tests need to assert language support.

## Technical Shape

Keep the current app architecture and focus the redesign around these modules:

- `apps/web/src/arcade/ArcadeHeistScene.ts`: primary visual/gameplay scene overhaul.
- `apps/web/src/arcade/ArcadeHeistStage.tsx`: simplified touch controls and accessibility labels.
- `apps/web/src/arcade/arcade-types.ts`: HUD/debug state trimmed toward the new minimal contract.
- `apps/web/src/game-ui/MatchScreen.tsx`: minimal arcade overlay and final transition.
- `apps/web/src/styles/global.css`: home/play/final visual language and arcade overlay.
- `apps/web/src/i18n.ts`: short localized labels.
- `tests/e2e/play-now.spec.ts`: visual density, first-run, movement, route, and final smoke tests.

The deterministic shared game engine remains for future online/AI room modes. The local Play Now mode prioritizes playable arcade feel.

## Testing Strategy

Use TDD for behavior and presentation contracts.

Unit tests:

- Route guidance chooses first relic, then cashout/greed fork.
- Alibi pulse cooldown and lock-break reward.
- Music state mapping.
- HUD density helper returns minimal opening state.
- Localization returns compact labels for EN/RU/ZH.

Playwright tests:

- Play Now opens a full-screen nonblank arcade scene.
- Opening visible DOM text stays below a strict threshold.
- Player can move, dash, steal the first relic, trigger chase, and escape through debug-assisted or real controls.
- Mobile viewport has no overlapping controls/HUD.
- Final case file appears and can copy/share result.

Visual smoke:

- Desktop screenshot after spawn.
- Desktop screenshot after first steal/chase.
- Mobile screenshot after spawn.
- Canvas pixel check confirms nonblank, high-contrast scene.

## Success Criteria

This redesign is successful when:

- A new player understands the first goal within 5 seconds without reading a paragraph.
- The first steal happens within 20 seconds for an average tester.
- The first steal visibly changes the game: music, camera, alarm, rival movement.
- Opening gameplay visible text is minimal and does not dominate the screen.
- The game looks like a sci-fi arcade heist, not a debug map.
- The local test suite, build, and Playwright smoke tests pass.
- The branch ships through PR with passing CI and Pages deployment.

## Non-Goals

Not included in this redesign pass:

- Rebuilding online multiplayer.
- Adding accounts, ranked, editor, or procedural maps.
- Full GTA-like open world, combat, vehicles, or NPC economy.
- Custom AI prompts.
- New music generation or asset licensing work.

