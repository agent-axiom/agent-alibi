import type { GameState, LegalAction } from "@agent-alibi/shared";
import { generateLegalActions } from "@agent-alibi/game";
import type { AIDecision } from "./decision-schema";
import { getAgentProfile } from "./profiles";

export function chooseFallbackDecision(state: GameState, playerId: string, profileId?: string): AIDecision {
  const profile = getAgentProfile(profileId);
  const legalActions = generateLegalActions(state, playerId);
  const chosen = legalActions
    .map((action) => ({ action, score: scoreAction(state, action, profile.archetype) }))
    .sort((left, right) => right.score - left.score || left.action.label.localeCompare(right.action.label))[0]?.action;

  if (!chosen) {
    return {
      publicMessage: "I will keep my story short until I see a clean move.",
      chosenActionId: "no-action",
      intentSummary: "No legal actions were available.",
      confidence: "low"
    };
  }

  return {
    publicMessage: messageFor(chosen, profile.name),
    chosenActionId: chosen.id,
    intentSummary: intentFor(chosen),
    confidence: chosen.risk === "high" && profile.riskTolerance !== "high" ? "medium" : "high"
  };
}

function scoreAction(state: GameState, action: LegalAction, archetype: ReturnType<typeof getAgentProfile>["archetype"]): number {
  const riskBonus = action.risk === "high" ? 20 : action.risk === "medium" ? 10 : 4;
  if (action.kind === "escape") return scoreEscape(state, action, archetype);

  if (archetype === "chaotic") {
    if (action.kind === "steal" && action.risk === "high") return 140;
    if (action.kind === "sabotage") return 110 + riskBonus;
    if (action.kind === "steal") return 100 + riskBonus;
    if (action.kind === "distract") return 80;
  }

  if (archetype === "loyal") {
    if (action.kind === "cover" && targetHasSuspicion(state, action.payload.teammateId)) return 140;
    if (action.kind === "cover") return 65;
  }

  if (archetype === "scout") {
    if (action.kind === "scout") return 90;
    if (action.kind === "move") return 70;
  }

  if (archetype === "liar") {
    if (action.kind === "distract") return 95;
    if (action.kind === "cover") return 85;
    if (action.kind === "sabotage") return 75;
  }

  if (action.kind === "steal") return 80 + riskBonus;
  if (action.kind === "move") return 45;
  if (action.kind === "cover") return 40;
  if (action.kind === "scout") return 35;
  if (action.kind === "guard") return 20;
  return 10;
}

function scoreEscape(state: GameState, action: LegalAction, archetype: ReturnType<typeof getAgentProfile>["archetype"]): number {
  const actor = state.players.find((player) => player.id === action.actorId);
  const hasLoot = (actor?.inventory.length ?? 0) > 0;
  const urgent = state.round >= state.maxRounds || state.alarm >= 4;
  const nearlySealed = state.round >= state.maxRounds - 1;

  if (!urgent && !nearlySealed && !hasLoot) {
    return archetype === "loyal" ? 18 : 12;
  }

  const pressure = urgent ? 130 : nearlySealed ? 95 : 68;
  const lootBonus = hasLoot ? 30 : 0;
  return pressure + lootBonus;
}

function targetHasSuspicion(state: GameState, teammateId: string | undefined): boolean {
  if (!teammateId) return false;
  return (state.players.find((player) => player.id === teammateId)?.suspicion ?? 0) > 0;
}

function messageFor(action: LegalAction, agentName: string): string {
  if (action.kind === "cover") return `${agentName}: I can make the alibi sound boring enough to work.`;
  if (action.kind === "steal") return `${agentName}: The shiny thing is exposed. I am absolutely being normal about it.`;
  if (action.kind === "sabotage") return `${agentName}: That route looks unreliable. What a strange coincidence.`;
  if (action.kind === "escape") return `${agentName}: I see a clean exit. No hero speeches from me.`;
  if (action.kind === "scout") return `${agentName}: I will check the room before the vault gets louder.`;
  if (action.kind === "distract") return `${agentName}: I can keep their eyes on the wrong story.`;
  if (action.kind === "guard") return `${agentName}: Holding this room. Keep your receipts plausible.`;
  return `${agentName}: I have a plan, which is different from a confession.`;
}

function intentFor(action: LegalAction): string {
  if (action.kind === "steal") return `Take available loot despite ${action.risk} risk before the alarm rises.`;
  if (action.kind === "cover") return "Protect a teammate by lowering suspicion with an alibi.";
  if (action.kind === "sabotage") return `Create chaos with a ${action.risk} risk route block.`;
  if (action.kind === "escape") return "Secure points by leaving through an available exit.";
  return `Use ${action.kind} to improve the crew position.`;
}
