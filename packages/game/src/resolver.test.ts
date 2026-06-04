import type { LegalAction } from "@agent-alibi/shared";
import { describe, expect, it } from "vitest";
import { generateLegalActions } from "./legal-actions";
import { resolveRound } from "./resolver";
import { createInitialGameState } from "./state";

describe("resolveRound", () => {
  it("moves active players to adjacent open rooms", () => {
    const state = createInitialGameState({
      matchId: "m-test",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook"],
      seed: "seed"
    });
    const move = mustFindAction(state, "p-human", "Move to East Hall");

    const result = resolveRound(state, { "p-human": move }, "seed:1");

    expect(result.state.players.find((player) => player.id === "p-human")!.locationId).toBe("east-hall");
    expect(result.events.map((event) => event.text).join("\n")).toContain("moved to East Hall");
  });

  it("lets only one player steal the same artifact in a round", () => {
    const state = createInitialGameState({
      matchId: "m-test",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook"],
      seed: "seed"
    });
    state.players[0]!.locationId = "moon-gallery";
    state.players[1]!.locationId = "moon-gallery";
    const humanSteal = mustFindAction(state, "p-human", "Steal Moon Pearl");
    const aiSteal = mustFindAction(state, "p-ai-rook-1", "Steal Moon Pearl");

    const result = resolveRound(state, { "p-human": humanSteal, "p-ai-rook-1": aiSteal }, "seed:2");

    const pearl = result.state.artifacts.find((artifact) => artifact.id === "moon-pearl")!;
    expect(pearl.takenBy).toBe("p-human");
    expect(result.state.players.find((player) => player.id === "p-human")!.inventory).toContain("moon-pearl");
    expect(result.state.players.find((player) => player.id === "p-ai-rook-1")!.inventory).not.toContain("moon-pearl");
  });

  it("cover lowers teammate suspicion after a risky steal", () => {
    const state = createInitialGameState({
      matchId: "m-test",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook", "anchor"],
      seed: "seed"
    });
    state.players[0]!.locationId = "moon-gallery";
    state.players[2]!.locationId = "moon-gallery";
    const steal = mustFindAction(state, "p-human", "Steal Moon Pearl");
    const cover = mustFindAction(state, "p-ai-anchor-2", "Cover Agent You");

    const result = resolveRound(state, { "p-human": steal, "p-ai-anchor-2": cover }, "seed:3");

    expect(result.state.players.find((player) => player.id === "p-human")!.suspicion).toBe(1);
    expect(result.events.map((event) => event.text).join("\n")).toContain("covered Agent You");
  });

  it("sabotage blocks a route for the next round", () => {
    const state = createInitialGameState({
      matchId: "m-test",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook"],
      seed: "seed"
    });
    const sabotage = mustFindAction(state, "p-human", "Sabotage route to East Hall");

    const result = resolveRound(state, { "p-human": sabotage }, "seed:4");

    const edge = result.state.edges.find(
      (candidate) => candidate.from === "atrium" && candidate.to === "east-hall"
    )!;
    expect(edge.blockedRounds).toBe(1);
    expect(generateLegalActions(result.state, "p-ai-rook-1").map((action) => action.label)).not.toContain(
      "Move to East Hall"
    );
  });

  it("finishes after the final round and catches agents left inside", () => {
    const state = createInitialGameState({
      matchId: "m-test",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook"],
      seed: "seed"
    });
    state.round = 6;
    state.players[0]!.locationId = "inner-vault";
    const scout = mustFindAction(state, "p-human", "Scout nearby rooms");

    const result = resolveRound(state, { "p-human": scout }, "seed:5");

    expect(result.state.phase).toBe("finished");
    expect(result.state.players.find((player) => player.id === "p-human")!.status).toBe("caught");
    expect(result.events.map((event) => event.text).join("\n")).toContain("sealed inside");
  });
});

function mustFindAction(state: Parameters<typeof generateLegalActions>[0], playerId: string, label: string): LegalAction {
  const action = generateLegalActions(state, playerId).find((candidate) => candidate.label === label);
  if (!action) {
    throw new Error(`Missing action ${label} for ${playerId}`);
  }
  return action;
}
