# Top-Down Heist Rebuild Design

## Goal

Turn Agent Alibi from a card-first planning UI into a playable top-down sci-fi heist with immediate movement, audio pressure, AI rivals, artifact pickups, and a clear escape objective.

## Player Experience

The judge clicks Play Now vs AI and lands in a live Moon Vault arena. The player moves with WASD or arrow keys, steals glowing artifacts, avoids rising alarm pressure, watches AI agents race through the vault, and escapes before lockdown. The UI should feel like a mission HUD, not a form.

## Scope

This pass focuses on local solo play. Online rooms can keep the existing round/card flow until the arcade loop is stable.

Included:
- Menu music from `agent_alibi_main_loop.mp3`.
- Dynamic game music: stealth, alarm, lockdown loops.
- Phaser top-down movement for the human agent.
- AI agents moving around the vault, stealing artifacts, and creating pressure.
- Artifact pickup, alarm, timer, escape, mission result, and final case file.
- Minimal HUD: timer, alarm, loot, objective, radio feed, controls hint.

Not included in this pass:
- Networked real-time multiplayer.
- Full combat, weapons, NPC factions, or open-world GTA systems.
- Custom level editor.

## Audio Design

Audio files live in `apps/web/public/audio/`.

Tracks:
- `agent_alibi_main_loop.mp3`: home/menu.
- `music_stealth_loop.mp3`: early mission.
- `music_alarm_loop.mp3`: high alarm or active chase.
- `music_lockdown_loop.mp3`: final seconds or max alarm.

Playback starts after a user gesture. The app crossfades between loops instead of hard restarting them.

## Arcade Loop

The arcade mission runs inside Phaser and reports compact HUD updates to React. React remains responsible for routing, final case file, and top-level music phase.

Mission rules:
- Player starts in the Atrium.
- Artifacts are placed in Moon Vault rooms.
- Walking into an artifact pickup radius steals it.
- AI agents path between rooms and can steal visible artifacts.
- Alarm rises over time and jumps when AI/player actions create chaos.
- Escape is available at Atrium/Crystal Lift after the player has loot or lockdown begins.
- Mission ends when the player escapes, is caught by max alarm at lockdown, or the timer expires.

## Controls

- WASD / arrow keys: move.
- Shift: short dash.
- E / Space: interact when near an escape or special object.

The first playable slice must be playable without reading a manual; HUD labels stay short and contextual.

## Technical Design

New pure modules:
- `apps/web/src/arcade/music.ts`: maps screen/mission state to a music track id.
- `apps/web/src/arcade/arcade-rules.ts`: score and final summary helpers.

New runtime modules:
- `apps/web/src/audio/useDynamicMusic.ts`: creates looped audio elements and crossfades them.
- `apps/web/src/arcade/ArcadeHeistScene.ts`: Phaser scene for live movement, AI, pickups, alarm, and mission finish.
- `apps/web/src/arcade/ArcadeHeistStage.tsx`: React wrapper for the Phaser scene.

Modified modules:
- `apps/web/src/local/useLocalMatch.ts`: adds arcade HUD/result state and finish handler.
- `apps/web/src/game-ui/MatchScreen.tsx`: renders the arcade stage for local solo play and keeps the old card flow as fallback for online.
- `apps/web/src/lobby/HomeScreen.tsx`: supports menu sound state.
- `apps/web/src/App.tsx`: wires music phase and sound toggle.
- `apps/web/src/styles/global.css`: replaces old planning dock dominance with arcade HUD.

## Testing

Tests cover pure behavior first:
- Music phase selection.
- Arcade score/final summary generation.

Smoke test:
- Play Now vs AI opens the arcade scene.
- The scene shows the live mission HUD.
- A debug finish hook completes the mission in Playwright so final case file is verified without relying on real-time player movement.

Manual verification:
- Browser desktop screenshot.
- Browser mobile screenshot.
- Confirm canvas is nonblank and controls/HUD do not overlap.

## Risks

Autoplay restrictions mean menu music cannot start until the user clicks or taps. The app should expose a sound toggle and also unlock audio when Play Now is clicked.

The old deterministic round engine remains useful for online mode and future AI logic, but local solo will now use the arcade mission loop for moment-to-moment play.
