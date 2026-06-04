import { describe, expect, it } from "vitest";
import { createInitialGameState } from "@agent-alibi/game";
import { chooseFallbackDecision } from "./fallback-bots";

describe("chooseFallbackDecision", () => {
  it("always returns a legal action and short public message", () => {
    const state = createInitialGameState({
      matchId: "m-ai",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook"],
      seed: "seed"
    });

    const decision = chooseFallbackDecision(state, "p-ai-rook-1", "rook");

    expect(decision.chosenActionId).toContain("p-ai-rook-1");
    expect(decision.publicMessage.length).toBeLessThanOrEqual(180);
    expect(decision.confidence).toMatch(/low|medium|high/);
  });

  it("lets Gremlin prefer chaos when a high-risk steal is available", () => {
    const state = createInitialGameState({
      matchId: "m-ai",
      humanPlayerName: "Agent You",
      aiProfileIds: ["gremlin"],
      seed: "seed"
    });
    state.players[1]!.locationId = "moon-gallery";

    const decision = chooseFallbackDecision(state, "p-ai-gremlin-1", "gremlin");

    expect(decision.chosenActionId).toContain("steal");
    expect(decision.intentSummary).toContain("risk");
  });

  it("lets Anchor cover suspicious teammates first", () => {
    const state = createInitialGameState({
      matchId: "m-ai",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook", "anchor"],
      seed: "seed"
    });
    state.players[0]!.suspicion = 3;

    const decision = chooseFallbackDecision(state, "p-ai-anchor-2", "anchor");

    expect(decision.chosenActionId).toContain("cover");
    expect(decision.publicMessage).toContain("alibi");
  });

  it("does not let fallback agents escape from the Atrium on round one", () => {
    const state = createInitialGameState({
      matchId: "m-ai",
      humanPlayerName: "Agent You",
      aiProfileIds: ["rook", "anchor"],
      seed: "seed"
    });

    const rook = chooseFallbackDecision(state, "p-ai-rook-1", "rook");
    const anchor = chooseFallbackDecision(state, "p-ai-anchor-2", "anchor");

    expect(rook.chosenActionId).not.toContain("escape");
    expect(anchor.chosenActionId).not.toContain("escape");
  });
});
