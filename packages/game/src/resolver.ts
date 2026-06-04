import type { GameState, LegalAction, PlayerState, RevealEvent } from "@agent-alibi/shared";
import { findEdge, isAdjacentAndOpen } from "./legal-actions";

export type LockedActions = Record<string, LegalAction>;

export type ResolveRoundResult = {
  state: GameState;
  events: RevealEvent[];
};

export function resolveRound(previousState: GameState, lockedActions: LockedActions, rngSeed: string): ResolveRoundResult {
  const state = cloneGameState(previousState);
  state.rngSeed = rngSeed;
  state.phase = "revealing";
  state.edges = state.edges.map((edge) => ({ ...edge, blockedRounds: Math.max(0, edge.blockedRounds - 1) }));

  const events: RevealEvent[] = [];
  const actions = Object.values(lockedActions);

  resolveEscape(state, actions, events);
  resolveMove(state, actions, events);
  resolveScout(state, actions, events);
  resolvePressureActions(state, actions, events);
  resolveSteal(state, actions, events);
  resolveCover(state, actions, events);
  updateAlarm(state, actions, events);
  resolveCaughtChecks(state, events);

  if (state.round >= state.maxRounds) {
    resolveFinalSeal(state, events);
    state.phase = "finished";
  } else {
    state.round += 1;
    state.phase = "briefing";
  }

  state.revealLog = [...state.revealLog, ...events];
  return { state, events };
}

function resolveEscape(state: GameState, actions: LegalAction[], events: RevealEvent[]): void {
  for (const action of actions.filter((candidate) => candidate.kind === "escape")) {
    const player = activePlayer(state, action.actorId);
    if (!player || !state.exits.includes(player.locationId)) continue;
    player.status = "escaped";
    events.push(event(state, "success", `${player.name} escaped through the lunar hatch.`, [player.id]));
  }
}

function resolveMove(state: GameState, actions: LegalAction[], events: RevealEvent[]): void {
  for (const action of actions.filter((candidate) => candidate.kind === "move")) {
    const player = activePlayer(state, action.actorId);
    const destinationRoomId = action.payload.destinationRoomId;
    if (!player || !destinationRoomId || !isAdjacentAndOpen(state, player.locationId, destinationRoomId)) continue;

    player.locationId = destinationRoomId;
    const room = state.rooms.find((candidate) => candidate.id === destinationRoomId);
    events.push(event(state, "info", `${player.name} moved to ${room?.name ?? "an unknown room"}.`, [player.id]));
  }
}

function resolveScout(state: GameState, actions: LegalAction[], events: RevealEvent[]): void {
  for (const action of actions.filter((candidate) => candidate.kind === "scout")) {
    const player = activePlayer(state, action.actorId);
    if (!player) continue;
    const artifacts = state.artifacts.filter((artifact) => artifact.roomId === player.locationId && !artifact.takenBy);
    const detail =
      artifacts.length > 0
        ? `spotted ${artifacts.map((artifact) => artifact.name).join(", ")}`
        : "found only singing dust";
    events.push(event(state, "info", `${player.name} scouted and ${detail}.`, [player.id]));
  }
}

function resolvePressureActions(state: GameState, actions: LegalAction[], events: RevealEvent[]): void {
  for (const action of actions.filter((candidate) => candidate.kind === "distract")) {
    const player = activePlayer(state, action.actorId);
    const target = activePlayer(state, action.payload.targetId);
    if (!player || !target || target.teamId === player.teamId) continue;
    target.suspicion += 1;
    events.push(event(state, "danger", `${player.name} distracted ${target.name} with a forged moon permit.`, [
      player.id,
      target.id
    ]));
  }

  for (const action of actions.filter((candidate) => candidate.kind === "guard")) {
    const player = activePlayer(state, action.actorId);
    if (!player) continue;
    const room = state.rooms.find((candidate) => candidate.id === player.locationId);
    events.push(event(state, "info", `${player.name} guarded ${room?.name ?? "the room"}.`, [player.id]));
  }

  for (const action of actions.filter((candidate) => candidate.kind === "sabotage")) {
    const player = activePlayer(state, action.actorId);
    const fromRoomId = action.payload.fromRoomId;
    const toRoomId = action.payload.toRoomId;
    if (!player || !fromRoomId || !toRoomId) continue;
    const edge = findEdge(state, fromRoomId, toRoomId);
    if (!edge || edge.blockedRounds > 0 || (edge.from !== player.locationId && edge.to !== player.locationId)) continue;

    edge.blockedRounds = 1;
    player.suspicion += 2;
    const room = state.rooms.find((candidate) => candidate.id === (edge.from === player.locationId ? edge.to : edge.from));
    events.push(event(state, "betrayal", `${player.name} sabotaged the route to ${room?.name ?? "a nearby room"}.`, [
      player.id
    ]));
  }
}

function resolveSteal(state: GameState, actions: LegalAction[], events: RevealEvent[]): void {
  for (const action of actions.filter((candidate) => candidate.kind === "steal")) {
    const player = activePlayer(state, action.actorId);
    const artifactId = action.payload.artifactId;
    if (!player || !artifactId) continue;

    const artifact = state.artifacts.find((candidate) => candidate.id === artifactId);
    if (!artifact || artifact.takenBy || artifact.roomId !== player.locationId) {
      events.push(event(state, "danger", `${player.name} reached for an artifact, but it was already gone.`, [player.id]));
      continue;
    }

    artifact.takenBy = player.id;
    player.inventory.push(artifact.id);
    player.suspicion += artifact.size === "major" ? 2 : 1;
    events.push(event(state, "success", `${player.name} stole the ${artifact.name}.`, [player.id]));
  }
}

function resolveCover(state: GameState, actions: LegalAction[], events: RevealEvent[]): void {
  for (const action of actions.filter((candidate) => candidate.kind === "cover")) {
    const player = activePlayer(state, action.actorId);
    const teammate = activePlayer(state, action.payload.teammateId);
    if (!player || !teammate || player.teamId !== teammate.teamId || player.id === teammate.id) continue;
    teammate.suspicion = Math.max(0, teammate.suspicion - 1);
    events.push(event(state, "success", `${player.name} covered ${teammate.name} with a flawless alibi.`, [
      player.id,
      teammate.id
    ]));
  }
}

function updateAlarm(state: GameState, actions: LegalAction[], events: RevealEvent[]): void {
  const noisyActionCount = actions.filter((action) => action.kind === "steal" || action.kind === "sabotage").length;
  const alarmIncrease = noisyActionCount > 0 ? 2 : 1;
  state.alarm = Math.min(5, state.alarm + alarmIncrease);
  events.push(event(state, state.alarm >= 4 ? "danger" : "info", `Alarm rises to ${state.alarm}/5.`));
}

function resolveCaughtChecks(state: GameState, events: RevealEvent[]): void {
  for (const player of state.players.filter((candidate) => candidate.status === "active")) {
    const room = state.rooms.find((candidate) => candidate.id === player.locationId);
    const pressure = player.suspicion + state.alarm + (room?.danger ?? 0);
    if (pressure >= 7) {
      player.status = "caught";
      events.push(event(state, "danger", `${player.name} was caught by moonlit security.`, [player.id]));
    }
  }
}

function resolveFinalSeal(state: GameState, events: RevealEvent[]): void {
  for (const player of state.players.filter((candidate) => candidate.status === "active")) {
    player.status = "caught";
    events.push(event(state, "danger", `${player.name} was sealed inside the Moon Vault.`, [player.id]));
  }
}

function activePlayer(state: GameState, playerId: string | undefined): PlayerState | undefined {
  if (!playerId) return undefined;
  const player = state.players.find((candidate) => candidate.id === playerId);
  return player?.status === "active" ? player : undefined;
}

function event(state: GameState, tone: RevealEvent["tone"], text: string, playerIds?: string[]): RevealEvent {
  return {
    id: `r${state.round}-e${state.revealLog.length + text.length}-${playerIds?.join("-") ?? "table"}`,
    round: state.round,
    tone,
    text,
    playerIds
  };
}

function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    rooms: state.rooms.map((room) => ({ ...room })),
    edges: state.edges.map((edge) => ({ ...edge })),
    exits: [...state.exits],
    players: state.players.map((player) => ({
      ...player,
      inventory: [...player.inventory]
    })),
    artifacts: state.artifacts.map((artifact) => ({ ...artifact })),
    revealLog: state.revealLog.map((revealEvent) => ({
      ...revealEvent,
      playerIds: revealEvent.playerIds ? [...revealEvent.playerIds] : undefined
    }))
  };
}
