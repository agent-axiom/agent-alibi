import { describe, expect, it } from "vitest";
import { buildActiveActionHint, buildArcadeGuidance, buildObjectiveCompass, buildRivalPressure } from "./guidance";

describe("buildArcadeGuidance", () => {
  it("builds a compact steal compass with the target, direction, and distance", () => {
    const compass = buildObjectiveCompass({
      kind: "artifact",
      targetLabel: "Moon Pearl +3",
      directionLabel: "Target NE 43m",
      distanceMeters: 43,
      cashoutValue: null,
      timeLeftMs: 140_000
    });

    expect(compass).toEqual({
      tone: "focus",
      verb: "STEAL",
      target: "Moon Pearl +3",
      route: "NE 43m",
      detail: "Follow gold beam"
    });
  });

  it("switches the compass to a cashout call after loot is secured", () => {
    const compass = buildObjectiveCompass({
      kind: "escape",
      targetLabel: "Atrium Lift",
      directionLabel: "Cashout +5 SW 12m",
      distanceMeters: 12,
      cashoutValue: 5,
      timeLeftMs: 90_000
    });

    expect(compass).toEqual({
      tone: "success",
      verb: "CASHOUT",
      target: "+5 at Atrium Lift",
      route: "SW 12m",
      detail: "Follow cyan ring"
    });
  });

  it("makes carrier runs read like urgent chases", () => {
    const compass = buildObjectiveCompass({
      kind: "carrier",
      targetLabel: "Rook +3",
      directionLabel: "Carrier W 18m",
      distanceMeters: 18,
      cashoutValue: null,
      timeLeftMs: 80_000
    });

    expect(compass).toEqual({
      tone: "danger",
      verb: "CHASE",
      target: "Rook +3",
      route: "W 18m",
      detail: "Recover before Red cashout"
    });
  });

  it("keeps scan compass routes short so rival status text is not duplicated", () => {
    const compass = buildObjectiveCompass({
      kind: "scan",
      targetLabel: "Rook scan",
      directionLabel: "Rival on you: Rook E 8m",
      distanceMeters: 8,
      cashoutValue: null,
      timeLeftMs: 80_000
    });

    expect(compass).toEqual({
      tone: "danger",
      verb: "JAM",
      target: "Rook scan",
      route: "E 8m",
      detail: "Press E / Space"
    });
  });

  it("turns a relic target into a comeback call when Red has already banked loot", () => {
    const compass = buildObjectiveCompass({
      kind: "artifact",
      targetLabel: "Argent Crown +3",
      directionLabel: "Target E 38m",
      distanceMeters: 38,
      cashoutValue: null,
      timeLeftMs: 84_000,
      rivalLead: 3,
      swingValue: 5
    });

    expect(compass).toEqual({
      tone: "danger",
      verb: "COMEBACK",
      target: "Argent Crown +3",
      route: "E 38m",
      detail: "Steal + cashout beats Red"
    });
  });

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

  it("calls out cashout value when the player reaches the lift", () => {
    const guidance = buildArcadeGuidance({
      lootValue: 3,
      aiLootValue: 1,
      artifactsStolen: 1,
      totalArtifacts: 5,
      targetArtifactName: "Argent Crown",
      nearArtifactName: null,
      nearExit: true,
      canEscape: true,
      cashoutValue: 5,
      timeLeftMs: 100_000
    });

    expect(guidance.objective).toBe("Escape with 3 loot");
    expect(guidance.prompt).toBe("Press E / Space to cashout +5");
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

  it("shows the cashout value when escape is in reach", () => {
    const hint = buildActiveActionHint({
      alibiPulseReady: false,
      nearArtifactName: null,
      nearExit: true,
      canEscape: true,
      cashoutValue: 5
    });

    expect(hint.key).toBe("E / Space");
    expect(hint.label).toBe("Cashout +5");
    expect(hint.tone).toBe("success");
  });

  it("prioritizes cashout over alibi pulse when escape is in reach", () => {
    const hint = buildActiveActionHint({
      alibiPulseReady: true,
      nearRivalCarrierName: null,
      nearArtifactName: "Moon Pearl",
      nearExit: true,
      canEscape: true,
      cashoutValue: 7
    });

    expect(hint.key).toBe("E / Space");
    expect(hint.label).toBe("Cashout +7");
    expect(hint.tone).toBe("success");
  });

  it("prioritizes intercepting a rival carrier over jamming a scan", () => {
    const hint = buildActiveActionHint({
      alibiPulseReady: true,
      nearRivalCarrierName: "Rook",
      nearRivalCarrierRelicName: "Moon Pearl",
      nearRivalCarrierValue: 3,
      nearArtifactName: null,
      nearExit: false,
      canEscape: false
    });

    expect(hint.key).toBe("E / Space");
    expect(hint.label).toBe("Recover Moon Pearl +3");
    expect(hint.tone).toBe("danger");
  });
});
