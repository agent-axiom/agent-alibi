import { io, type Socket } from "socket.io-client";
import type { ClientEvent, GameState, LegalAction, MatchSummary, PublicRoomState, ServerEvent } from "@agent-alibi/shared";

export type OnlineRoomSnapshot = {
  room: PublicRoomState | null;
  state: GameState | null;
  legalActions: LegalAction[];
  summary: MatchSummary | null;
  error: string | null;
};

export type OnlineRoomListener = (snapshot: OnlineRoomSnapshot) => void;

export class OnlineRoomClient {
  private socket: Socket | null = null;
  private snapshot: OnlineRoomSnapshot = {
    room: null,
    state: null,
    legalActions: [],
    summary: null,
    error: null
  };
  private listeners = new Set<OnlineRoomListener>();

  connect(): void {
    if (this.socket) return;
    const url = import.meta.env.VITE_SERVER_URL || window.location.origin;
    this.socket = io(url, { transports: ["websocket", "polling"] });
    this.socket.on("server:event", (event: ServerEvent) => {
      this.handleServerEvent(event);
    });
  }

  createRoom(playerName: string): void {
    this.send({ type: "room:create", playerName });
  }

  joinRoom(roomCode: string, playerName: string): void {
    this.send({ type: "room:join", roomCode, playerName });
  }

  addAi(profileId: string): void {
    this.send({ type: "slot:add_ai", profileId });
  }

  removeAi(slotId: string): void {
    this.send({ type: "slot:remove_ai", slotId });
  }

  startMatch(): void {
    this.send({ type: "match:start" });
  }

  lockAction(actionId: string): void {
    this.send({ type: "action:lock", actionId });
  }

  subscribe(listener: OnlineRoomListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private send(event: ClientEvent): void {
    this.connect();
    this.socket?.emit("client:event", event);
  }

  private handleServerEvent(event: ServerEvent): void {
    if (event.type === "room:state") {
      this.snapshot = { ...this.snapshot, room: event.room, state: event.room.match ?? this.snapshot.state, error: null };
    }
    if (event.type === "match:state") {
      this.snapshot = { ...this.snapshot, state: event.state, legalActions: event.legalActions ?? [], error: null };
    }
    if (event.type === "match:finished") {
      this.snapshot = { ...this.snapshot, summary: event.summary, error: null };
    }
    if (event.type === "error") {
      this.snapshot = { ...this.snapshot, error: event.message };
    }
    this.emit();
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}
