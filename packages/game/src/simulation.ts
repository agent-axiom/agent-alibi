import type { GameState, LegalAction, MatchSummary } from "@agent-alibi/shared";
import { generateLegalActions } from "./legal-actions";
import { resolveRound } from "./resolver";
import { buildMatchSummary } from "./scoring";
import { createInitialGameState } from "./state";

export type ScriptedMatchResult = {
  state: GameState;
  summary: MatchSummary;
};

export function runScriptedMatch(seed: string): ScriptedMatchResult {
  let state = createInitialGameState({
    matchId: `sim-${seed}`,
    humanPlayerName: "Agent Sim",
    aiProfileIds: ["rook", "gremlin", "anchor"],
    seed
  });

  while (state.phase !== "finished") {
    const lockedActions: Record<string, LegalAction> = {};
    for (const player of state.players.filter((candidate) => candidate.status === "active")) {
      const action = chooseScriptedAction(state, player.id);
      if (action) {
        lockedActions[player.id] = action;
      }
    }
    state = resolveRound(state, lockedActions, `${seed}:round-${state.round}`).state;
  }

  return {
    state,
    summary: buildMatchSummary(state)
  };
}

function chooseScriptedAction(state: GameState, playerId: string): LegalAction | undefined {
  const actions = generateLegalActions(state, playerId);
  if (actions.length === 0) return undefined;

  const shouldEscape = state.round >= state.maxRounds || state.alarm >= 4;
  const priorities = [
    shouldEscape ? "escape" : "steal",
    "steal",
    "cover",
    "move",
    "scout",
    "guard",
    "sabotage",
    "distract"
  ];

  for (const kind of priorities) {
    const action = actions.find((candidate) => candidate.kind === kind);
    if (action) return action;
  }

  return actions[0];
}
