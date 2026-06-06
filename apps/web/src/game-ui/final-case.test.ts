import { describe, expect, it } from "vitest";
import type { MatchSummary } from "@agent-alibi/shared";
import { buildRematchHook } from "./FinalCaseFile";

function summary(overrides: Partial<MatchSummary> = {}): MatchSummary {
  return {
    winnerTeamId: "blue",
    teamScores: [
      { teamId: "blue", loot: 3, escape: 2, penalties: 0, total: 5 },
      { teamId: "red", loot: 0, escape: 0, penalties: 0, total: 0 }
    ],
    mvpPlayerId: "p-human",
    title: "Hot Exit",
    caseFile: "AGENT ALIBI CASE FILE",
    ...overrides
  };
}

describe("buildRematchHook", () => {
  it("turns a red win into a carrier denial rematch prompt", () => {
    expect(
      buildRematchHook(
        summary({
          winnerTeamId: "red",
          teamScores: [
            { teamId: "blue", loot: 0, escape: 0, penalties: -3, total: -3 },
            { teamId: "red", loot: 3, escape: 1, penalties: 0, total: 4 }
          ],
          rivalRelicNames: ["Moon Pearl"]
        })
      )
    ).toBe("Next run: deny the carrier before Red reaches the Atrium Lift.");
  });

  it("turns a non-perfect blue win into an S-Rank chase prompt", () => {
    expect(buildRematchHook(summary({ runRating: "A-Rank", styleBonus: 2 }))).toBe("Next run: chase S-Rank with a faster, lower-alarm cashout.");
  });
});
