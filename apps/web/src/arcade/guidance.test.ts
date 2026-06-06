import { describe, expect, it } from "vitest";
import { buildArcadeGuidance } from "./guidance";

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
});
