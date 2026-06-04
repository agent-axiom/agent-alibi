import type { GameState, LegalAction } from "@agent-alibi/shared";
import { generateLegalActions } from "@agent-alibi/game";
import { getAgentProfile } from "./profiles";

export type AIObservation = {
  matchId: string;
  round: number;
  maxRounds: number;
  you: {
    id: string;
    name: string;
    team: string;
    location: string;
    profile: ReturnType<typeof getAgentProfile>;
  };
  publicState: {
    alarm: number;
    knownArtifacts: string[];
    recentEvents: string[];
  };
  legalActions: LegalAction[];
};

export function buildObservation(state: GameState, playerId: string): AIObservation {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    throw new Error(`Cannot build AI observation for missing player ${playerId}`);
  }
  const room = state.rooms.find((candidate) => candidate.id === player.locationId);
  return {
    matchId: state.matchId,
    round: state.round,
    maxRounds: state.maxRounds,
    you: {
      id: player.id,
      name: player.name,
      team: player.teamId,
      location: room?.name ?? player.locationId,
      profile: getAgentProfile(player.agentProfileId)
    },
    publicState: {
      alarm: state.alarm,
      knownArtifacts: state.artifacts.filter((artifact) => !artifact.takenBy).map((artifact) => artifact.name),
      recentEvents: state.revealLog.slice(-6).map((event) => event.text)
    },
    legalActions: generateLegalActions(state, player.id)
  };
}
