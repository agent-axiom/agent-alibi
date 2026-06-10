import { describe, expect, it } from "vitest";
import { buildGetawayMissionResult, selectGetawayObjective, updateGetawayChasePressure } from "./getaway-rules";

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

describe("updateGetawayChasePressure", () => {
  it("does not build capture pressure before the relic is stolen", () => {
    expect(
      updateGetawayChasePressure({
        hasRelic: false,
        rivalsReleased: true,
        nearestRivalDistance: 20,
        previousContactMs: 500,
        deltaMs: 200
      })
    ).toEqual({
      contactMs: 0,
      caught: false,
      pressure: "clear"
    });
  });

  it("catches the player when a rival stays close during the getaway", () => {
    expect(
      updateGetawayChasePressure({
        hasRelic: true,
        rivalsReleased: true,
        nearestRivalDistance: 42,
        previousContactMs: 520,
        deltaMs: 160
      })
    ).toEqual({
      contactMs: 680,
      caught: true,
      pressure: "critical"
    });
  });

  it("lets the player break contact by leaving the capture radius", () => {
    expect(
      updateGetawayChasePressure({
        hasRelic: true,
        rivalsReleased: true,
        nearestRivalDistance: 120,
        previousContactMs: 500,
        deltaMs: 200
      })
    ).toEqual({
      contactMs: 160,
      caught: false,
      pressure: "warning"
    });
  });
});
