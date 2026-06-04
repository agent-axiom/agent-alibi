import { describe, expect, it } from "vitest";
import { createInitialGameState, generateLegalActions } from "@agent-alibi/game";
import { buildActionCards } from "./action-cards";

describe("buildActionCards", () => {
  it("returns at most three cards from legal actions", () => {
    const state = createInitialGameState({
      matchId: "cards",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook", "gremlin", "anchor"],
      seed: "cards"
    });

    const cards = buildActionCards(state, generateLegalActions(state, "p-human"));

    expect(cards.length).toBeLessThanOrEqual(3);
    expect(cards.map((card) => card.role)).toEqual(["objective", "social", "risk"]);
  });

  it("prioritizes stealing when the player is in a room with loot", () => {
    const state = createInitialGameState({
      matchId: "cards-steal",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook"],
      seed: "cards"
    });
    state.players[0]!.locationId = "vault-door";

    const cards = buildActionCards(state, generateLegalActions(state, "p-human"));

    expect(cards[0]).toMatchObject({ kind: "steal", role: "objective" });
  });
});
