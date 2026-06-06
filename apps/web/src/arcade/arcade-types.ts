import type { GameState } from "@agent-alibi/shared";
import type { ArcadeMissionResult } from "./arcade-rules";
import type { ArcadeLoopStep } from "./guidance";

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
  loopStep: ArcadeLoopStep;
  raceStatus: string;
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
