import type { GameState } from "@agent-alibi/shared";
import type { ArcadeMissionResult } from "./arcade-rules";
import type { ActiveActionHint, ArcadeLoopStep, RivalPressureLevel } from "./guidance";
import type { RivalScanStatus } from "./rival-scan";

export const ARCADE_MISSION_DURATION_MS = 150_000;

export type ArcadeHudPhase = "stealth" | "alarm" | "lockdown" | "escaped" | "sealed" | "caught";

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
  greedStatus: string | null;
  targetDistanceLabel: string | null;
  rivalStatus: string;
  rivalDistanceLabel: string | null;
  rivalPressureLevel: RivalPressureLevel;
  rivalScanStatus: RivalScanStatus;
  alibiPulseStatus: string;
  paceStatus: string;
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
