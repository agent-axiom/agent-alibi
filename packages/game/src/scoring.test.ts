import { describe, expect, it } from "vitest";
import { generateLegalActions } from "./legal-actions";
import { resolveRound } from "./resolver";
import { buildMatchSummary, getTeamScores } from "./scoring";
import { createInitialGameState } from "./state";

describe("scoring", () => {
  it("scores loot, escape bonuses, caught penalties, and final inside penalties", () => {
    const state = createInitialGameState({
      matchId: "m-score",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook", "anchor"],
      seed: "seed"
    });
    state.players[0]!.locationId = "moon-gallery";
    state.players[1]!.status = "caught";
    state.players[2]!.status = "escaped";
    state.phase = "finished";
    state.round = 6;
    state.artifacts.find((artifact) => artifact.id === "moon-pearl")!.takenBy = "p-human";
    state.players[0]!.inventory.push("moon-pearl");

    const scores = getTeamScores(state);
    const blue = scores.find((score) => score.teamId === "blue")!;
    const red = scores.find((score) => score.teamId === "red")!;

    expect(blue).toMatchObject({ loot: 3, escape: 2, penalties: -2, total: 3 });
    expect(red).toMatchObject({ loot: 0, escape: 0, penalties: -1, total: -1 });
  });

  it("builds a shareable match summary with winner and MVP", () => {
    const state = createInitialGameState({
      matchId: "m-summary",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook"],
      seed: "seed"
    });
    state.players[0]!.locationId = "moon-gallery";
    const steal = generateLegalActions(state, "p-human").find((action) => action.label === "Steal Moon Pearl")!;
    const afterSteal = resolveRound(state, { "p-human": steal }, "seed:1").state;
    afterSteal.players[0]!.status = "escaped";
    afterSteal.players[1]!.status = "caught";
    afterSteal.phase = "finished";
    afterSteal.round = 6;

    const summary = buildMatchSummary(afterSteal);

    expect(summary.winnerTeamId).toBe("blue");
    expect(summary.mvpPlayerId).toBe("p-human");
    expect(summary.title).toMatch(/Moon|Disaster|Chaos|Alibi/);
    expect(summary.caseFile).toContain("AGENT ALIBI CASE FILE");
    expect(summary.caseFile).toContain("Winner: Blue Crew");
  });
});
