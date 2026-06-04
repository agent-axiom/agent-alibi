import type { GameState, RevealEvent } from "@agent-alibi/shared";

export type HeistSceneSnapshot = {
  state: GameState;
  latestEvents: RevealEvent[];
  selectedPlayerId?: string;
};
