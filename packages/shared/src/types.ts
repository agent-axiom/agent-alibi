export type TeamId = "blue" | "red";
export type PlayerKind = "human" | "ai";
export type PlayerStatus = "active" | "escaped" | "caught";
export type RoundPhase = "briefing" | "locking" | "revealing" | "finished";
export type ActionRisk = "low" | "medium" | "high";
export type ActionKind =
  | "move"
  | "scout"
  | "steal"
  | "distract"
  | "guard"
  | "sabotage"
  | "cover"
  | "escape";

export type Room = {
  id: string;
  name: string;
  x: number;
  y: number;
  danger: number;
};

export type MapEdge = {
  from: string;
  to: string;
  blockedRounds: number;
};

export type ArtifactState = {
  id: string;
  name: string;
  roomId: string;
  value: number;
  size: "minor" | "major";
  takenBy?: string;
};

export type PlayerState = {
  id: string;
  kind: PlayerKind;
  name: string;
  teamId: TeamId;
  locationId: string;
  status: PlayerStatus;
  suspicion: number;
  inventory: string[];
  agentProfileId?: string;
};

export type RevealEvent = {
  id: string;
  round: number;
  tone: "info" | "success" | "danger" | "betrayal";
  text: string;
  playerIds?: string[];
};

export type GameState = {
  matchId: string;
  phase: RoundPhase;
  round: number;
  maxRounds: number;
  rngSeed: string;
  rooms: Room[];
  edges: MapEdge[];
  exits: string[];
  players: PlayerState[];
  artifacts: ArtifactState[];
  alarm: number;
  revealLog: RevealEvent[];
};

export type LegalAction = {
  id: string;
  label: string;
  kind: ActionKind;
  risk: ActionRisk;
  actorId: string;
  payload: Record<string, string>;
};

export type LockedAction = {
  playerId: string;
  actionId: string;
  action: LegalAction;
};

export type TeamScore = {
  teamId: TeamId;
  loot: number;
  escape: number;
  penalties: number;
  total: number;
};

export type MatchSummary = {
  winnerTeamId: TeamId | "tie";
  teamScores: TeamScore[];
  mvpPlayerId?: string;
  biggestBetrayal?: string;
  mostSuspiciousPlayerId?: string;
  title: string;
  runRating?: string;
  styleBonus?: number;
  afterburnerExitBonus?: number;
  lockBreakCashoutBonus?: number;
  comebackRoutesArmed?: number;
  lootChain?: number;
  greedRoute?: "successful" | "skipped";
  stolenRelicNames?: string[];
  rivalRelicNames?: string[];
  pendingRivalRelicNames?: string[];
  alibiPulsesUsed?: number;
  scanBurns?: number;
  carrierIntercepts?: number;
  interceptedRelicNames?: string[];
  highlightLines?: string[];
  caseFile: string;
};
