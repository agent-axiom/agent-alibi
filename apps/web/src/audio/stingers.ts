import type { ArcadeHudPhase } from "../arcade/arcade-types";

export type MissionStingerId = "steal" | "intercept" | "rival-cashout" | "lockdown" | "case-file";

export type MissionStingerSnapshot = {
  lootValue: number;
  aiLootValue: number;
  phase: ArcadeHudPhase;
  spotlight: string | null;
  summaryTitle: string | null;
};

export function selectMissionStinger(previous: MissionStingerSnapshot | null, current: MissionStingerSnapshot): MissionStingerId | null {
  if (current.summaryTitle && current.summaryTitle !== previous?.summaryTitle) return "case-file";
  if (current.phase === "lockdown" && previous?.phase !== "lockdown") return "lockdown";
  if (current.spotlight?.toLowerCase().startsWith("intercepted") && current.spotlight !== previous?.spotlight) return "intercept";
  if (previous && current.aiLootValue > previous.aiLootValue) return "rival-cashout";
  if (previous && current.lootValue > previous.lootValue) return "steal";
  return null;
}
