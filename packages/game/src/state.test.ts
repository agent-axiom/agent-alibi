import { describe, expect, it } from "vitest";
import { createInitialGameState } from "./state";

describe("createInitialGameState", () => {
  it("creates a playable Moon Vault setup for solo vs AI", () => {
    const state = createInitialGameState({
      matchId: "local-demo",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook", "gremlin", "vesper"],
      seed: "demo-seed"
    });

    expect(state.matchId).toBe("local-demo");
    expect(state.round).toBe(1);
    expect(state.maxRounds).toBe(6);
    expect(state.phase).toBe("briefing");
    expect(state.rooms.map((room) => room.id)).toContain("atrium");
    expect(state.players).toHaveLength(4);
    expect(state.players[0]).toMatchObject({
      kind: "human",
      name: "Agent You",
      teamId: "blue",
      locationId: "atrium",
      status: "active"
    });
    expect(state.players.filter((player) => player.kind === "ai")).toHaveLength(3);
    expect(state.artifacts.map((artifact) => artifact.name)).toEqual(
      expect.arrayContaining(["Moon Pearl", "Argent Crown", "Silver Key"])
    );
    expect(state.exits).toEqual(expect.arrayContaining(["atrium", "crystal-lift"]));
  });
});
