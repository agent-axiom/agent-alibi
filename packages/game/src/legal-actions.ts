import type { GameState, LegalAction, MapEdge, PlayerState } from "@agent-alibi/shared";
import { createAction } from "./actions";

export function generateLegalActions(state: GameState, playerId: string): LegalAction[] {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.status !== "active") {
    return [];
  }

  const actions: LegalAction[] = [];
  const currentRoom = state.rooms.find((room) => room.id === player.locationId);
  if (!currentRoom) {
    return [];
  }

  for (const destination of getAdjacentRoomIds(state, player.locationId)) {
    const room = state.rooms.find((candidate) => candidate.id === destination);
    if (!room) continue;
    actions.push(
      createAction({
        actorId: player.id,
        kind: "move",
        label: `Move to ${room.name}`,
        risk: room.danger >= 2 ? "medium" : "low",
        payload: { destinationRoomId: room.id }
      })
    );
  }

  actions.push(
    createAction({
      actorId: player.id,
      kind: "scout",
      label: "Scout nearby rooms",
      risk: "low",
      payload: { roomId: player.locationId }
    })
  );

  for (const artifact of state.artifacts.filter(
    (candidate) => candidate.roomId === player.locationId && !candidate.takenBy
  )) {
    actions.push(
      createAction({
        actorId: player.id,
        kind: "steal",
        label: `Steal ${artifact.name}`,
        risk: artifact.size === "major" ? "high" : "medium",
        payload: { artifactId: artifact.id }
      })
    );
  }

  for (const target of getEnemyPlayers(state, player)) {
    actions.push(
      createAction({
        actorId: player.id,
        kind: "distract",
        label: `Distract ${target.name}`,
        risk: "medium",
        payload: { targetId: target.id }
      })
    );
  }

  actions.push(
    createAction({
      actorId: player.id,
      kind: "guard",
      label: `Guard ${currentRoom.name}`,
      risk: "low",
      payload: { roomId: currentRoom.id }
    })
  );

  for (const edge of getOpenEdgesFrom(state, player.locationId)) {
    const otherRoomId = edge.from === player.locationId ? edge.to : edge.from;
    const otherRoom = state.rooms.find((room) => room.id === otherRoomId);
    if (!otherRoom) continue;
    actions.push(
      createAction({
        actorId: player.id,
        kind: "sabotage",
        label: `Sabotage route to ${otherRoom.name}`,
        risk: "high",
        payload: { fromRoomId: edge.from, toRoomId: edge.to }
      })
    );
  }

  for (const teammate of getTeammates(state, player)) {
    actions.push(
      createAction({
        actorId: player.id,
        kind: "cover",
        label: `Cover ${teammate.name}`,
        risk: "low",
        payload: { teammateId: teammate.id }
      })
    );
  }

  if (state.exits.includes(player.locationId)) {
    actions.push(
      createAction({
        actorId: player.id,
        kind: "escape",
        label: "Escape through the lunar hatch",
        risk: "low",
        payload: { exitId: player.locationId }
      })
    );
  }

  return actions;
}

export function getAdjacentRoomIds(state: GameState, roomId: string): string[] {
  return getOpenEdgesFrom(state, roomId).map((edge) => (edge.from === roomId ? edge.to : edge.from));
}

export function isAdjacentAndOpen(state: GameState, fromRoomId: string, toRoomId: string): boolean {
  return getOpenEdgesFrom(state, fromRoomId).some(
    (edge) =>
      (edge.from === fromRoomId && edge.to === toRoomId) || (edge.from === toRoomId && edge.to === fromRoomId)
  );
}

export function findEdge(state: GameState, fromRoomId: string, toRoomId: string): MapEdge | undefined {
  return state.edges.find(
    (edge) =>
      (edge.from === fromRoomId && edge.to === toRoomId) || (edge.from === toRoomId && edge.to === fromRoomId)
  );
}

function getOpenEdgesFrom(state: GameState, roomId: string): MapEdge[] {
  return state.edges.filter((edge) => edge.blockedRounds <= 0 && (edge.from === roomId || edge.to === roomId));
}

function getEnemyPlayers(state: GameState, player: PlayerState): PlayerState[] {
  return state.players.filter(
    (candidate) =>
      candidate.status === "active" &&
      candidate.teamId !== player.teamId &&
      candidate.locationId === player.locationId
  );
}

function getTeammates(state: GameState, player: PlayerState): PlayerState[] {
  return state.players.filter(
    (candidate) => candidate.status === "active" && candidate.teamId === player.teamId && candidate.id !== player.id
  );
}
