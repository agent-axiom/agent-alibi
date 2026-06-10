import { describe, expect, it } from "vitest";
import { buildGetawayMissionResult, selectGetawayObjective } from "./getaway-rules";

describe("selectGetawayObjective", () => {
  it("starts by sending the player to steal the Moon Pearl", () => {
    expect(selectGetawayObjective({ hasRelic: false, escaped: false, caught: false })).toEqual({
      phase: "steal",
      label: "Steal +3"
    });
  });

  it("switches to extraction after the relic is carried", () => {
    expect(selectGetawayObjective({ hasRelic: true, escaped: false, caught: false })).toEqual({
      phase: "escape",
      label: "Escape +5"
    });
  });

  it("closes the objective once the run is finished", () => {
    expect(selectGetawayObjective({ hasRelic: true, escaped: true, caught: false })).toEqual({
      phase: "finished",
      label: "Case closed"
    });
  });
});

describe("buildGetawayMissionResult", () => {
  it("maps a clean escape into the existing final case-file contract", () => {
    expect(
      buildGetawayMissionResult({
        outcome: "escaped",
        playerName: "amid",
        lootValue: 3,
        elapsedMs: 42_000,
        alarm: 2,
        alibiPulsesUsed: 1
      })
    ).toMatchObject({
      outcome: "escaped",
      playerName: "amid",
      lootValue: 3,
      artifactsStolen: 1,
      stolenRelicNames: ["Moon Pearl"],
      aiLootValue: 0,
      alarm: 2,
      elapsedMs: 42_000,
      alibiPulsesUsed: 1
    });
  });

  it("does not award the Moon Pearl when the vault seals before extraction", () => {
    expect(
      buildGetawayMissionResult({
        outcome: "sealed",
        playerName: "amid",
        lootValue: 0,
        elapsedMs: 150_000,
        alarm: 5,
        alibiPulsesUsed: 2
      })
    ).toMatchObject({
      outcome: "sealed",
      lootValue: 0,
      artifactsStolen: 0,
      stolenRelicNames: [],
      aiLootValue: 0,
      alarm: 5
    });
  });
});
