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

  it("lists stolen relic names in the shareable case file", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "escaped",
      playerName: "Agent You",
      lootValue: 6,
      artifactsStolen: 2,
      aiLootValue: 0,
      alarm: 2,
      elapsedMs: 50_000,
      stolenRelicNames: ["Moon Pearl", "Argent Crown"]
    });

    expect(summary.stolenRelicNames).toEqual(["Moon Pearl", "Argent Crown"]);
    expect(summary.caseFile).toContain("Relics Stolen: Moon Pearl, Argent Crown");
  });

  it("builds short case highlights for the final share card", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "escaped",
      playerName: "Agent You",
      lootValue: 6,
      artifactsStolen: 2,
      aiLootValue: 0,
      alarm: 2,
      elapsedMs: 50_000,
      stolenRelicNames: ["Moon Pearl", "Argent Crown"]
    });

    expect(summary.highlightLines).toContain("Stole Moon Pearl + Argent Crown");
    expect(summary.highlightLines).toContain("Escaped with 6 loot");
    expect(summary.highlightLines).toContain("Clean exit bonus +3");
  });

  it("records alibi pulse saves and scan burns in the shareable case file", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "escaped",
      playerName: "Agent You",
      lootValue: 3,
      artifactsStolen: 1,
      aiLootValue: 0,
      alarm: 3,
      elapsedMs: 58_000,
      alibiPulsesUsed: 2,
      scanBurns: 1
    });

    expect(summary.alibiPulsesUsed).toBe(2);
    expect(summary.scanBurns).toBe(1);
    expect(summary.caseFile).toContain("Alibi Pulses: 2");
    expect(summary.caseFile).toContain("Scan Burns: 1");
  });

  it("records carrier intercepts as a shareable match highlight", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "escaped",
      playerName: "Agent You",
      lootValue: 3,
      artifactsStolen: 1,
      aiLootValue: 0,
      alarm: 2,
      elapsedMs: 55_000,
      carrierIntercepts: 1,
      interceptedRelicNames: ["Moon Pearl"]
    });

    expect(summary.carrierIntercepts).toBe(1);
    expect(summary.interceptedRelicNames).toEqual(["Moon Pearl"]);
    expect(summary.title).toBe("Carrier Denied");
    expect(summary.highlightLines).toContain("Case title: Carrier Denied");
    expect(summary.caseFile).toContain("Carrier Intercepts: 1");
    expect(summary.caseFile).toContain("Recovered From Rivals: Moon Pearl");
  });

  it("separates pending carrier loot from cashed-out rival relics", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "sealed",
      playerName: "Agent You",
      lootValue: 0,
      artifactsStolen: 0,
      aiLootValue: 0,
      alarm: 5,
      elapsedMs: 150_000,
      rivalRelicNames: [],
      pendingRivalRelicNames: ["Moon Pearl"]
    });

    expect(summary.rivalRelicNames).toEqual([]);
    expect(summary.pendingRivalRelicNames).toEqual(["Moon Pearl"]);
    expect(summary.title).toBe("Lift Denied");
    expect(summary.highlightLines).toContain("Case title: Lift Denied");
    expect(summary.caseFile).toContain("Rival Relics: none");
    expect(summary.caseFile).toContain("Pending Carrier Loot: Moon Pearl");
  });
});
