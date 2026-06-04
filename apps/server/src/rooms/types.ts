import type { GameState, LegalAction, MatchSummary, PublicRoomSlot } from "@agent-alibi/shared";

export type RoomSlot = PublicRoomSlot & {
  socketId?: string;
  playerId?: string;
};

export type Room = {
  code: string;
  slots: RoomSlot[];
  hostSocketId: string;
  match: GameState | null;
  legalActionsByPlayer: Record<string, LegalAction[]>;
  lockedActions: Record<string, LegalAction>;
  summary: MatchSummary | null;
};
