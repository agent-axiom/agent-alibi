import { describe, expect, it } from "vitest";
import { buildArcadeMatchSummary } from "./arcade-rules";

describe("buildArcadeMatchSummary", () => {
  it("rewards an escaped player with loot and a readable case file", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "escaped",
      playerName: "Agent You",
      lootValue: 7,
      artifactsStolen: 3,
      aiLootValue: 4,
      alarm: 3,
      elapsedMs: 96_000
    });

    expect(summary.winnerTeamId).toBe("blue");
    expect(summary.teamScores.find((score) => score.teamId === "blue")?.total).toBe(9);
    expect(summary.caseFile).toContain("AGENT ALIBI CASE FILE");
    expect(summary.caseFile).toContain("Agent You escaped");
    expect(summary.caseFile).toContain("3 relics");
  });

  it("penalizes a sealed vault ending", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "sealed",
      playerName: "Agent You",
      lootValue: 2,
      artifactsStolen: 1,
      aiLootValue: 5,
      alarm: 5,
      elapsedMs: 150_000
    });

    expect(summary.winnerTeamId).toBe("red");
    expect(summary.teamScores.find((score) => score.teamId === "blue")?.penalties).toBe(-3);
    expect(summary.caseFile).toContain("Vault sealed");
  });

  it("adds a clean exit bonus for fast low-alarm escapes", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "escaped",
      playerName: "Agent You",
      lootValue: 3,
      artifactsStolen: 1,
      aiLootValue: 0,
      alarm: 2,
      elapsedMs: 42_000
    });

    expect(summary.runRating).toBe("S-Rank");
    expect(summary.styleBonus).toBe(3);
    expect(summary.teamScores.find((score) => score.teamId === "blue")?.total).toBe(8);
    expect(summary.caseFile).toContain("Run Rating: S-Rank");
    expect(summary.caseFile).toContain("Clean exit bonus: +3");
  });

  it("records a successful greed route in the shareable case file", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "escaped",
      playerName: "Agent You",
      lootValue: 6,
      artifactsStolen: 2,
      aiLootValue: 0,
      alarm: 2,
      elapsedMs: 50_000
    });

    expect(summary.caseFile).toContain("Loot Chain: x2");
    expect(summary.caseFile).toContain("Greed Route: successful");
  });
});
