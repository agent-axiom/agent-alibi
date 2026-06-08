import type { GameState } from "@agent-alibi/shared";
import type { ArcadeMissionResult } from "./arcade-rules";
import type { DirectorCue } from "./director-cue";
import type { ActiveActionHint, ArcadeLoopStep, ObjectiveCompass, RivalPressureLevel } from "./guidance";
import type { RivalScanStatus } from "./rival-scan";

export const ARCADE_MISSION_DURATION_MS = 150_000;

export type ArcadeHudPhase = "stealth" | "alarm" | "lockdown" | "escaped" | "sealed" | "caught";

export type ArcadeRadarBlip = {
  id: string;
  kind: "player" | "target" | "exit" | "rival" | "carrier";
  label: string;
  x: number;
  y: number;
};

export type ArcadeVaultCondition = {
  tone: "stable" | "alarm" | "lockdown";
  label: string;
  detail: string;
};

export type ArcadeEscapePayout = {
  escapeBonus: number;
  cashout: number;
};

export type ArcadeExtractionCue = {
  tone: "armed" | "ready";
  label: string;
  detail: string;
  action: string;
};

export type ArcadeExtractionSequence = {
  active: true;
  label: "EXTRACTION LIVE";
  outcome: "escaped" | "sealed" | "caught";
  cashoutValue: number;
  remainingMs: number;
  beamVisible: boolean;
};

export type ArcadeHunterChaseCue = {
  agentName: string;
  distanceMeters: number;
  beamCount: number;
};

export type ArcadeLockBreakPayoff = {
  cashoutValue: number;
  baseCashoutValue: number;
  bonus: number;
  secondsLeft: number;
  timerPercent: number;
  activeMs: number;
};

export type ArcadeRouteChoice = {
  mode: "escape" | "greed";
  cashoutNow: number;
  greedRelicName: string;
  greedRelicValue: number;
  greedDistanceMeters: number;
  projectedCashout: number;
};

export type ArcadeRoutePulse = {
  mode: "escape" | "greed" | "alibi" | "comeback";
  title: string;
  detail: string;
  action: string;
};

export type ArcadeAlibiPayoff = {
  label: "Alibi Pulse";
  result: string;
  detail: string;
  action: string;
};

export type ArcadeCleanBonusWindow = {
  label: string;
  detail: string;
  secondsLeft: number;
};

export type ArcadeRivalIntercept = {
  agentName: string;
  relicName: string;
  value: number;
  swingValue: number;
  distanceMeters: number;
  directionLabel: string;
  cashoutSeconds: number;
  urgency: "chase" | "critical";
};

export type ArcadeRivalObjective = {
  tone: "warning" | "danger";
  label: "Rival Objective";
  title: string;
  detail: string;
  action: string;
};

export type ArcadeLootChainWindow = {
  label: string;
  detail: string;
  secondsLeft: number;
};

export type ArcadeLootSpeedSurge = {
  label: "Afterburner" | "Ghost Step" | "Breach Sprint";
  multiplier: number;
  secondsLeft: number;
  source: string | null;
  exitBonus: boolean;
};

export type ArcadeComboCashoutWindow = {
  label: "Breakout Cashout";
  bonus: number;
  cashoutValue: number;
  secondsLeft: number;
};

export type ArcadeMissionBeat = {
  tone: "focus" | "danger" | "success";
  kicker: string;
  title: string;
  detail: string;
  action: string;
};

export type ArcadeThreatCue = {
  tone: "danger" | "warning";
  label: string;
  detail: string;
  action: string;
};

export type ArcadeScorePopup = {
  tone: "loot" | "bonus" | "recover" | "rival";
  label: string;
  detail: string;
};

export type ArcadeObjectiveBanner = {
  tone: "steal" | "escape" | "greed" | "finish";
  title: string;
  detail: string;
};

export type ArcadeRivalBark = {
  tone: "taunt" | "panic";
  agentName: string;
  line: string;
};

export type ArcadeHudState = {
  phase: ArcadeHudPhase;
  timeLeftMs: number;
  alarm: number;
  lootValue: number;
  aiLootValue: number;
  aiPendingLootValue: number;
  artifactsStolen: number;
  totalArtifacts: number;
  canEscape: boolean;
  dashReady: boolean;
  objective: string;
  prompt: string;
  objectiveCompass: ObjectiveCompass;
  activeAction: ActiveActionHint;
  loopStep: ArcadeLoopStep;
  raceStatus: string;
  lastRivalSteal: string | null;
  rivalIntercept: ArcadeRivalIntercept | null;
  rivalObjective: ArcadeRivalObjective | null;
  vaultCondition: ArcadeVaultCondition;
  escapePayout: ArcadeEscapePayout | null;
  extractionCue: ArcadeExtractionCue | null;
  extractionSequence: ArcadeExtractionSequence | null;
  hunterChaseCue: ArcadeHunterChaseCue | null;
  lockBreakPayoff: ArcadeLockBreakPayoff | null;
  routeChoice: ArcadeRouteChoice | null;
  routePulse: ArcadeRoutePulse | null;
  alibiPayoff: ArcadeAlibiPayoff | null;
  radarBlips: ArcadeRadarBlip[];
  greedStatus: string | null;
  targetDistanceLabel: string | null;
  rivalStatus: string;
  rivalDistanceLabel: string | null;
  rivalPressureLevel: RivalPressureLevel;
  rivalScanStatus: RivalScanStatus;
  alibiPulseStatus: string;
  paceStatus: string;
  cleanBonusWindow: ArcadeCleanBonusWindow | null;
  lootChainWindow: ArcadeLootChainWindow | null;
  lootSpeedSurge: ArcadeLootSpeedSurge | null;
  comboCashoutWindow: ArcadeComboCashoutWindow | null;
  missionBeat: ArcadeMissionBeat;
  directorCue: DirectorCue;
  threatCue: ArcadeThreatCue | null;
  objectiveBanner: ArcadeObjectiveBanner | null;
  rivalBark: ArcadeRivalBark | null;
  scorePopup: ArcadeScorePopup | null;
  spotlight: string | null;
  feed: string[];
};

export type ArcadeMissionConfig = {
  state: GameState;
  runId: string;
  onHudUpdate: (hud: ArcadeHudState) => void;
  onFinish: (result: ArcadeMissionResult) => void;
};

export type ArcadeController = {
  enabled: true;
  runId: string;
  hud: ArcadeHudState | null;
  updateHud: (hud: ArcadeHudState) => void;
  finishMission: (result: ArcadeMissionResult) => void;
};
