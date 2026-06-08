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

  it("adds an afterburner exit bonus for cashout during boost", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "escaped",
      playerName: "Agent You",
      lootValue: 3,
      artifactsStolen: 1,
      aiLootValue: 0,
      alarm: 2,
      elapsedMs: 42_000,
      afterburnerExit: true
    });

    expect(summary.afterburnerExitBonus).toBe(1);
    expect(summary.teamScores.find((score) => score.teamId === "blue")?.total).toBe(9);
    expect(summary.highlightLines).toContain("Afterburner exit +1");
    expect(summary.caseFile).toContain("Afterburner Exit Bonus: +1");
  });

  it("adds a breakout cashout bonus after a broken Rook lock", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "escaped",
      playerName: "Agent You",
      lootValue: 3,
      artifactsStolen: 1,
      aiLootValue: 0,
      alarm: 2,
      elapsedMs: 42_000,
      lockBreakCashoutBonus: 2
    });

    expect(summary.title).toBe("Breakout Cashout");
    expect(summary.lockBreakCashoutBonus).toBe(2);
    expect(summary.teamScores.find((score) => score.teamId === "blue")?.total).toBe(10);
    expect(summary.highlightLines).toContain("Breakout cashout +2");
    expect(summary.caseFile).toContain("Cashout Banked: +7");
    expect(summary.caseFile).toContain("Breakout Cashout Bonus: +2");
  });

  it("keeps breakout cashout in top highlights when ambush also lands", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "escaped",
      playerName: "Agent You",
      lootValue: 3,
      artifactsStolen: 1,
      aiLootValue: 0,
      alarm: 2,
      elapsedMs: 42_000,
      lockBreakCashoutBonus: 2,
      ambushNearMisses: 1,
      stolenRelicNames: ["Moon Pearl"],
      pendingRivalRelicNames: ["Crystal Ledger"],
      afterburnerExit: true
    });

    expect(summary.highlightLines).toContain("Breakout cashout +2");
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
    expect(summary.highlightLines).toContain("Cashed out +8 at lift");
    expect(summary.highlightLines).toContain("Escaped with 6 loot");
    expect(summary.highlightLines).toContain("Clean exit bonus +3");
    expect(summary.caseFile).toContain("Cashout Banked: +8");
  });

  it("describes a no-loot escape as survival instead of a cashout", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "escaped",
      playerName: "Agent You",
      lootValue: 0,
      artifactsStolen: 0,
      aiLootValue: 0,
      alarm: 2,
      elapsedMs: 125_000
    });

    expect(summary.title).toBe("Empty-Handed Exit");
    expect(summary.highlightLines).toContain("Escaped before the seal");
    expect(summary.highlightLines).toContain("No relics banked");
    expect(summary.highlightLines).not.toContain("Cashed out +2 at lift");
    expect(summary.caseFile).toContain("Title: Empty-Handed Exit");
    expect(summary.caseFile).toContain("Escape Bonus: +2");
    expect(summary.caseFile).toContain("Agent You escaped empty-handed before lockdown.");
    expect(summary.caseFile).not.toContain("Cashout Banked");
  });

  it("records comeback cashouts as a shareable case highlight", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "escaped",
      playerName: "Agent You",
      lootValue: 3,
      artifactsStolen: 1,
      aiLootValue: 3,
      alarm: 3,
      elapsedMs: 74_000,
      comebackRoutesArmed: 1
    } as any);

    expect((summary as any).comebackRoutesArmed).toBe(1);
    expect(summary.title).toBe("Comeback Cashout");
    expect(summary.highlightLines).toContain("Comeback cashout beat Red from behind");
    expect(summary.caseFile).toContain("Comeback Routes: 1");
    expect(summary.caseFile).toContain("Comeback Swing: beat Red from behind");
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

  it("records ambush near-misses as a shareable skill highlight", () => {
    const summary = buildArcadeMatchSummary({
      outcome: "escaped",
      playerName: "Agent You",
      lootValue: 3,
      artifactsStolen: 1,
      aiLootValue: 0,
      alarm: 2,
      elapsedMs: 55_000,
      ambushNearMisses: 2
    });

    expect(summary.ambushNearMisses).toBe(2);
    expect(summary.highlightLines).toContain("Dashed through rival ambush x2");
    expect(summary.caseFile).toContain("Ambush Dodges: 2");
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
      interceptedRelicNames: ["Moon Pearl"],
      interceptedLootValue: 3
    });

    expect(summary.carrierIntercepts).toBe(1);
    expect(summary.interceptedRelicNames).toEqual(["Moon Pearl"]);
    expect(summary.title).toBe("Carrier Denied");
    expect(summary.highlightLines).toContain("Case title: Carrier Denied");
    expect(summary.caseFile).toContain("Carrier Intercepts: 1");
    expect(summary.caseFile).toContain("Recovered From Rivals: Moon Pearl");
    expect(summary.caseFile).toContain("Denial Swing: +3 recovered / +3 denied");
    expect(summary.caseFile).toContain("Agent You escaped with 1 relic before lockdown.");
    expect(summary.caseFile).not.toContain("1 relics");
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
