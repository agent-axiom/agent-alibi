import type { GameState } from "@agent-alibi/shared";
import type { ArcadeMissionResult } from "./arcade-rules";
import type { ActiveActionHint, ArcadeLoopStep, RivalPressureLevel } from "./guidance";
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

export type ArcadeCleanBonusWindow = {
  label: string;
  detail: string;
  secondsLeft: number;
};

export type ArcadeRivalIntercept = {
  agentName: string;
  relicName: string;
  value: number;
  distanceMeters: number;
};

export type ArcadeLootChainWindow = {
  label: string;
  detail: string;
  secondsLeft: number;
};

export type ArcadeMissionBeat = {
  tone: "focus" | "danger" | "success";
  kicker: string;
  title: string;
  detail: string;
  action: string;
};

export type ArcadeHudState = {
  phase: ArcadeHudPhase;
  timeLeftMs: number;
  alarm: number;
  lootValue: number;
  aiLootValue: number;
  artifactsStolen: number;
  totalArtifacts: number;
  canEscape: boolean;
  dashReady: boolean;
  objective: string;
  prompt: string;
  activeAction: ActiveActionHint;
  loopStep: ArcadeLoopStep;
  raceStatus: string;
  lastRivalSteal: string | null;
  rivalIntercept: ArcadeRivalIntercept | null;
  vaultCondition: ArcadeVaultCondition;
  escapePayout: ArcadeEscapePayout | null;
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
  missionBeat: ArcadeMissionBeat;
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
