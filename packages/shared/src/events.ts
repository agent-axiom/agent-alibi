import type { GameState, LegalAction, MatchSummary } from "./types";

export type PublicRoomSlot = {
  id: string;
  kind: "human" | "ai" | "empty";
  name?: string;
  agentProfileId?: string;
  ready?: boolean;
};

export type PublicRoomState = {
  code: string;
  slots: PublicRoomSlot[];
  match?: GameState;
};

export type ClientEvent =
  | { type: "room:create"; playerName: string }
  | { type: "room:join"; roomCode: string; playerName: string }
  | { type: "slot:add_ai"; profileId: string }
  | { type: "slot:remove_ai"; slotId: string }
  | { type: "match:start" }
  | { type: "chat:send"; text: string }
  | { type: "action:lock"; actionId: string }
  | { type: "action:unlock" };

export type ServerEvent =
  | { type: "room:state"; room: PublicRoomState }
  | { type: "match:state"; state: GameState; legalActions?: LegalAction[] }
  | { type: "round:briefing_started"; round: number }
  | { type: "ai:thinking"; playerId: string }
  | { type: "player:locked"; playerId: string }
  | { type: "round:revealed"; events: GameState["revealLog"] }
  | { type: "match:finished"; summary: MatchSummary }
  | { type: "error"; message: string };
