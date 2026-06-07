export type AppMusicScreen = "home" | "match" | "room" | "final";
export type MusicTrackId = "menu" | "stealth" | "alarm" | "lockdown";

export type MusicSelectionInput = {
  screen: AppMusicScreen;
  isArcade?: boolean;
  alarm?: number;
  timeLeftMs?: number;
  boostActive?: boolean;
  rivalPressureActive?: boolean;
};

const LOCKDOWN_TIME_MS = 30_000;

export function selectMusicTrack(input: MusicSelectionInput): MusicTrackId | null {
  if (input.screen === "home" || input.screen === "room" || input.screen === "final") {
    return "menu";
  }

  if (input.screen !== "match") {
    return null;
  }

  if (!input.isArcade) {
    return "stealth";
  }

  const alarm = input.alarm ?? 1;
  const timeLeftMs = input.timeLeftMs ?? Number.POSITIVE_INFINITY;

  if (alarm >= 5 || timeLeftMs <= LOCKDOWN_TIME_MS) {
    return "lockdown";
  }

  if (input.boostActive || input.rivalPressureActive) {
    return "alarm";
  }

  if (alarm >= 3) {
    return "alarm";
  }

  return "stealth";
}
