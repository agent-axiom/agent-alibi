import { describe, expect, it } from "vitest";
import { buildActiveActionHint, buildArcadeGuidance, buildRivalPressure } from "./guidance";

describe("buildArcadeGuidance", () => {
  it("starts with a concrete theft objective instead of a vague instruction", () => {
    const guidance = buildArcadeGuidance({
      lootValue: 0,
      aiLootValue: 0,
      artifactsStolen: 0,
      totalArtifacts: 5,
      targetArtifactName: "Moon Pearl",
      nearArtifactName: null,
      nearExit: false,
      canEscape: false,
      timeLeftMs: 140_000
    });

    expect(guidance.objective).toBe("Steal the Moon Pearl");
    expect(guidance.prompt).toBe("Follow the gold marker");
    expect(guidance.loopStep).toBe("steal");
    expect(guidance.greedStatus).toBeNull();
  });

  it("asks for an explicit interaction when the player is beside a relic", () => {
    const guidance = buildArcadeGuidance({
      lootValue: 0,
      aiLootValue: 0,
      artifactsStolen: 0,
      totalArtifacts: 5,
      targetArtifactName: "Moon Pearl",
      nearArtifactName: "Moon Pearl",
      nearExit: false,
      canEscape: false,
      timeLeftMs: 130_000
    });

    expect(guidance.objective).toBe("Steal the Moon Pearl");
    expect(guidance.prompt).toBe("Press E / Space to steal");
  });

  it("switches to escape guidance after the player has loot", () => {
    const guidance = buildArcadeGuidance({
      lootValue: 3,
      aiLootValue: 1,
      artifactsStolen: 1,
      totalArtifacts: 5,
      targetArtifactName: "Argent Crown",
      nearArtifactName: null,
      nearExit: false,
      canEscape: true,
      timeLeftMs: 100_000
    });

    expect(guidance.objective).toBe("Escape with 3 loot");
    expect(guidance.prompt).toBe("Return to the Atrium lift");
    expect(guidance.loopStep).toBe("escape");
    expect(guidance.greedStatus).toBe("Optional relic: Argent Crown");
  });

  it("calls out when the AI crew is ahead", () => {
    const guidance = buildArcadeGuidance({
      lootValue: 1,
      aiLootValue: 4,
      artifactsStolen: 1,
      totalArtifacts: 5,
      targetArtifactName: "Argent Crown",
      nearArtifactName: null,
      nearExit: false,
      canEscape: true,
      timeLeftMs: 70_000
    });

    expect(guidance.raceStatus).toBe("AI crew is ahead by 3");
  });

  it("keeps rival scan calm before rivals are released", () => {
    const pressure = buildRivalPressure({
      aiReleased: false,
      nearestRivalName: "Vesper",
      distanceMeters: 9
    });

    expect(pressure.level).toBe("standby");
    expect(pressure.label).toBe("Nearest rival 9m");
    expect(pressure.radioLine).toBeNull();
  });

  it("escalates rival scan when an active rival gets close", () => {
    const pressure = buildRivalPressure({
      aiReleased: true,
      nearestRivalName: "Vesper",
      distanceMeters: 18
    });

    expect(pressure.level).toBe("closing");
    expect(pressure.label).toBe("Rival close: Vesper 18m");
    expect(pressure.radioLine).toBe("Rival closing: Vesper is 18m out.");
  });

  it("marks immediate rival contact as danger", () => {
    const pressure = buildRivalPressure({
      aiReleased: true,
      nearestRivalName: "Gremlin",
      distanceMeters: 8
    });

    expect(pressure.level).toBe("danger");
    expect(pressure.label).toBe("Rival on you: Gremlin 8m");
    expect(pressure.radioLine).toBe("Rival on you: Gremlin. Dash or break line.");
  });

  it("shows movement as the default active action", () => {
    const hint = buildActiveActionHint({
      alibiPulseReady: false,
      nearArtifactName: null,
      nearExit: false,
      canEscape: false
    });

    expect(hint.key).toBe("Move");
    expect(hint.label).toBe("Follow marker");
    expect(hint.tone).toBe("neutral");
  });

  it("prioritizes stealing when a relic is in reach", () => {
    const hint = buildActiveActionHint({
      alibiPulseReady: false,
      nearArtifactName: "Moon Pearl",
      nearArtifactValue: 3,
      nearExit: false,
      canEscape: false
    });

    expect(hint.key).toBe("E / Space");
    expect(hint.label).toBe("Steal Moon Pearl +3");
    expect(hint.tone).toBe("success");
  });

  it("prioritizes alibi pulse over other contextual actions", () => {
    const hint = buildActiveActionHint({
      alibiPulseReady: true,
      nearRivalCarrierName: null,
      nearArtifactName: "Moon Pearl",
      nearExit: true,
      canEscape: true
    });

    expect(hint.key).toBe("E / Space");
    expect(hint.label).toBe("Jam scan");
    expect(hint.tone).toBe("danger");
  });

  it("prioritizes intercepting a rival carrier over jamming a scan", () => {
    const hint = buildActiveActionHint({
      alibiPulseReady: true,
      nearRivalCarrierName: "Rook",
      nearArtifactName: null,
      nearExit: false,
      canEscape: false
    });

    expect(hint.key).toBe("E / Space");
    expect(hint.label).toBe("Intercept carrier");
    expect(hint.tone).toBe("danger");
  });
});
