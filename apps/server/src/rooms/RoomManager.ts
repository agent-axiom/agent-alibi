import type { GameState, LegalAction, MatchSummary, PlayerState, PublicRoomState } from "@agent-alibi/shared";
import { chooseFallbackDecision } from "@agent-alibi/ai";
import { buildMatchSummary, createInitialGameState, generateLegalActions, resolveRound } from "@agent-alibi/game";
import { sanitizeName } from "../safety/sanitize";
import type { Room, RoomSlot } from "./types";

const MAX_SLOTS = 6;
const DEFAULT_AI_NAMES: Record<string, string> = {
  rook: "Rook",
  moth: "Moth",
  gremlin: "Gremlin",
  vesper: "Vesper",
  anchor: "Anchor"
};

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(socketId: string, playerName: string): Room {
    const code = this.createCode();
    const room: Room = {
      code,
      hostSocketId: socketId,
      slots: [
        {
          id: `slot-${code}-host`,
          kind: "human",
          name: sanitizeName(playerName),
          ready: true,
          socketId,
          playerId: "p-human-1"
        },
        ...Array.from({ length: MAX_SLOTS - 1 }, (_, index) => ({ id: `slot-${code}-empty-${index}`, kind: "empty" as const }))
      ],
      match: null,
      legalActionsByPlayer: {},
      lockedActions: {},
      summary: null
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  joinRoom(code: string, socketId: string, playerName: string): Room {
    const room = this.requireRoom(code);
    const slot = room.slots.find((candidate) => candidate.kind === "empty");
    if (!slot) throw new Error("Room is full.");
    Object.assign(slot, {
      kind: "human",
      name: sanitizeName(playerName),
      ready: true,
      socketId,
      playerId: `p-human-${room.slots.filter((candidate) => candidate.kind === "human").length + 1}`
    });
    return room;
  }

  addAi(code: string, profileId: string): Room {
    const room = this.requireRoom(code);
    const slot = room.slots.find((candidate) => candidate.kind === "empty");
    if (!slot) throw new Error("Room is full.");
    Object.assign(slot, {
      kind: "ai",
      agentProfileId: profileId,
      name: DEFAULT_AI_NAMES[profileId] ?? "Agent",
      ready: true,
      playerId: `p-ai-${profileId}-${room.slots.filter((candidate) => candidate.kind === "ai").length + 1}`
    });
    return room;
  }

  removeAi(code: string, slotId: string): Room {
    const room = this.requireRoom(code);
    const index = room.slots.findIndex((slot) => slot.id === slotId && slot.kind === "ai");
    if (index < 0) return room;
    room.slots[index] = { id: `slot-${code}-empty-${index}`, kind: "empty" };
    return room;
  }

  startMatch(code: string): Room {
    const room = this.requireRoom(code);
    const filledSlots = room.slots.filter((slot) => slot.kind === "human" || slot.kind === "ai");
    if (filledSlots.length < 2) {
      throw new Error("Add at least two slots before starting.");
    }

    const base = createInitialGameState({
      matchId: `room-${room.code}-${Date.now()}`,
      humanPlayerName: filledSlots[0]?.name ?? "Agent",
      aiProfileIds: [],
      seed: room.code
    });
    base.players = filledSlots.map((slot, index) => this.slotToPlayer(slot, index));
    room.match = base;
    room.lockedActions = {};
    room.legalActionsByPlayer = this.buildLegalActions(base);
    room.summary = null;
    return room;
  }

  lockAction(code: string, playerId: string, actionId: string): Room {
    const room = this.requireRoom(code);
    if (!room.match || room.match.phase === "finished") return room;
    const action = room.legalActionsByPlayer[playerId]?.find((candidate) => candidate.id === actionId);
    if (!action) throw new Error("Action is no longer legal.");
    room.lockedActions[playerId] = action;
    this.lockAiActions(room);
    const activePlayers = room.match.players.filter((player) => player.status === "active");
    const allLocked = activePlayers.every((player) => room.lockedActions[player.id] || player.kind === "ai");
    if (allLocked) {
      this.resolveRoomRound(room);
    }
    return room;
  }

  advanceAiOnly(code: string): Room {
    const room = this.requireRoom(code);
    if (!room.match || room.match.phase === "finished") return room;
    this.lockAiActions(room);
    this.resolveRoomRound(room);
    return room;
  }

  toPublicState(room: Room): PublicRoomState {
    return {
      code: room.code,
      slots: room.slots.map((slot) => ({
        id: slot.id,
        kind: slot.kind,
        name: slot.name,
        agentProfileId: slot.agentProfileId,
        ready: slot.ready
      })),
      match: room.match ?? undefined
    };
  }

  getLegalActions(room: Room, socketId: string): LegalAction[] {
    const playerId = room.slots.find((slot) => slot.socketId === socketId)?.playerId;
    return playerId ? room.legalActionsByPlayer[playerId] ?? [] : [];
  }

  getSummary(room: Room): MatchSummary | null {
    return room.summary;
  }

  private lockAiActions(room: Room): void {
    if (!room.match) return;
    for (const player of room.match.players.filter((candidate) => candidate.status === "active" && candidate.kind === "ai")) {
      if (room.lockedActions[player.id]) continue;
      const decision = chooseFallbackDecision(room.match, player.id, player.agentProfileId);
      const action = room.legalActionsByPlayer[player.id]?.find((candidate) => candidate.id === decision.chosenActionId);
      if (action) {
        room.lockedActions[player.id] = action;
      }
    }
  }

  private resolveRoomRound(room: Room): void {
    if (!room.match) return;
    const resolved = resolveRound(room.match, room.lockedActions, `${room.match.rngSeed}:${room.match.round}`);
    room.match = resolved.state;
    room.lockedActions = {};
    room.legalActionsByPlayer = this.buildLegalActions(resolved.state);
    if (resolved.state.phase === "finished") {
      room.summary = buildMatchSummary(resolved.state);
    }
  }

  private buildLegalActions(state: GameState): Record<string, LegalAction[]> {
    return Object.fromEntries(state.players.map((player) => [player.id, generateLegalActions(state, player.id)]));
  }

  private slotToPlayer(slot: RoomSlot, index: number): PlayerState {
    return {
      id: slot.playerId ?? `p-${index + 1}`,
      kind: slot.kind === "ai" ? "ai" : "human",
      name: slot.name ?? "Agent",
      teamId: index % 2 === 0 ? "blue" : "red",
      locationId: "atrium",
      status: "active",
      suspicion: 0,
      inventory: [],
      agentProfileId: slot.agentProfileId
    };
  }

  private requireRoom(code: string): Room {
    const room = this.getRoom(code);
    if (!room) throw new Error("Room not found.");
    return room;
  }

  private createCode(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let index = 0; index < 4; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return this.rooms.has(code) ? this.createCode() : code;
  }
}
