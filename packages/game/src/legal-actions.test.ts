import { describe, expect, it } from "vitest";
import { generateLegalActions } from "./legal-actions";
import { createInitialGameState } from "./state";

describe("generateLegalActions", () => {
  it("offers useful non-steal actions from the empty Atrium", () => {
    const state = createInitialGameState({
      matchId: "m-test",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook", "anchor"],
      seed: "seed"
    });

    const actions = generateLegalActions(state, "p-human");
    const labels = actions.map((action) => action.label);

    expect(labels).toEqual(expect.arrayContaining(["Move to East Hall", "Move to West Hall", "Scout nearby rooms"]));
    expect(actions.some((action) => action.kind === "guard")).toBe(true);
    expect(actions.some((action) => action.kind === "cover")).toBe(true);
    expect(actions.some((action) => action.kind === "steal")).toBe(false);
  });

  it("allows stealing artifacts in the current room and blocks escape away from exits", () => {
    const state = createInitialGameState({
      matchId: "m-test",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook"],
      seed: "seed"
    });
    state.players[0]!.locationId = "moon-gallery";

    const actions = generateLegalActions(state, "p-human");

    expect(actions.map((action) => action.label)).toContain("Steal Moon Pearl");
    expect(actions.some((action) => action.kind === "escape")).toBe(false);
  });
});
