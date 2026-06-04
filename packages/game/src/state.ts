import type { GameState, PlayerState, TeamId } from "@agent-alibi/shared";
import {
  cloneMoonVaultArtifacts,
  cloneMoonVaultEdges,
  cloneMoonVaultRooms,
  MOON_VAULT_EXITS
} from "./map";

export type InitialGameOptions = {
  matchId: string;
  humanPlayerName: string;
  aiProfileIds: string[];
  seed: string;
  maxRounds?: number;
};

const AI_NAMES: Record<string, string> = {
  rook: "Rook",
  moth: "Moth",
  gremlin: "Gremlin",
  vesper: "Vesper",
  anchor: "Anchor"
};

export function createInitialGameState(options: InitialGameOptions): GameState {
  const players: PlayerState[] = [
    createPlayer({
      id: "p-human",
      kind: "human",
      name: options.humanPlayerName,
      teamId: "blue"
    }),
    ...options.aiProfileIds.slice(0, 5).map((profileId, index) =>
      createPlayer({
        id: `p-ai-${profileId}-${index + 1}`,
        kind: "ai",
        name: AI_NAMES[profileId] ?? `Agent ${index + 1}`,
        teamId: index % 2 === 0 ? "red" : "blue",
        agentProfileId: profileId
      })
    )
  ];

  return {
    matchId: options.matchId,
    phase: "briefing",
    round: 1,
    maxRounds: options.maxRounds ?? 6,
    rngSeed: options.seed,
    rooms: cloneMoonVaultRooms(),
    edges: cloneMoonVaultEdges(),
    exits: [...MOON_VAULT_EXITS],
    players,
    artifacts: cloneMoonVaultArtifacts(),
    alarm: 1,
    revealLog: [
      {
        id: "intro",
        round: 1,
        tone: "info",
        text: "The Moon Vault opens. Six rounds remain before the lunar seals close."
      }
    ]
  };
}

type CreatePlayerInput = {
  id: string;
  kind: "human" | "ai";
  name: string;
  teamId: TeamId;
  agentProfileId?: string;
};

function createPlayer(input: CreatePlayerInput): PlayerState {
  return {
    id: input.id,
    kind: input.kind,
    name: input.name,
    teamId: input.teamId,
    locationId: "atrium",
    status: "active",
    suspicion: 0,
    inventory: [],
    agentProfileId: input.agentProfileId
  };
}
