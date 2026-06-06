import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import type { ArcadeHudState } from "../arcade/arcade-types";
import type { MatchSummary } from "@agent-alibi/shared";
import { selectMissionStinger, type MissionStingerId, type MissionStingerSnapshot } from "./stingers";

type MissionStingerInput = {
  enabled: boolean;
  hud: ArcadeHudState | null | undefined;
  summary: MatchSummary | null | undefined;
};

const STINGER_NOTES: Record<MissionStingerId, Array<[number, number]>> = {
  steal: [
    [660, 0],
    [990, 70]
  ],
  intercept: [
    [220, 0],
    [740, 80],
    [1180, 145]
  ],
  lockdown: [
    [180, 0],
    [150, 130]
  ],
  "case-file": [
    [523, 0],
    [659, 90],
    [784, 180]
  ]
};

export function useMissionStingers({ enabled, hud, summary }: MissionStingerInput) {
  const previousRef = useRef<MissionStingerSnapshot | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const snapshot = useMemo<MissionStingerSnapshot>(
    () => ({
      lootValue: hud?.lootValue ?? 0,
      phase: hud?.phase ?? "stealth",
      spotlight: hud?.spotlight ?? null,
      summaryTitle: summary?.title ?? null
    }),
    [hud?.lootValue, hud?.phase, hud?.spotlight, summary?.title]
  );

  useEffect(() => {
    const stinger = selectMissionStinger(previousRef.current, snapshot);
    previousRef.current = snapshot;
    if (!enabled || !stinger) return;
    playStinger(stinger, audioContextRef);
  }, [enabled, snapshot]);
}

function playStinger(stinger: MissionStingerId, audioContextRef: MutableRefObject<AudioContext | null>) {
  const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const context = audioContextRef.current ?? new AudioContextCtor();
  audioContextRef.current = context;
  void context.resume().catch(() => undefined);
  const startedAt = context.currentTime + 0.01;

  for (const [frequency, delayMs] of STINGER_NOTES[stinger]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const startsAt = startedAt + delayMs / 1000;
    oscillator.type = stinger === "lockdown" ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, startsAt);
    gain.gain.setValueAtTime(0, startsAt);
    gain.gain.linearRampToValueAtTime(stinger === "lockdown" ? 0.07 : 0.055, startsAt + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, startsAt + 0.18);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(startsAt);
    oscillator.stop(startsAt + 0.2);
  }
}
