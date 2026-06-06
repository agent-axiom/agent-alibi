import { useCallback, useEffect, useMemo, useRef } from "react";
import type { MusicTrackId } from "../arcade/music";
import { buildPublicAssetPath } from "../deploy/base-path";
import { fadeProgress } from "./fade";

const TRACK_SOURCES: Record<MusicTrackId, string> = {
  menu: buildPublicAssetPath(import.meta.env.BASE_URL, "audio/agent_alibi_main_loop.mp3"),
  stealth: buildPublicAssetPath(import.meta.env.BASE_URL, "audio/music_stealth_loop.mp3"),
  alarm: buildPublicAssetPath(import.meta.env.BASE_URL, "audio/music_alarm_loop.mp3"),
  lockdown: buildPublicAssetPath(import.meta.env.BASE_URL, "audio/music_lockdown_loop.mp3")
};

const TRACK_VOLUME: Record<MusicTrackId, number> = {
  menu: 0.42,
  stealth: 0.5,
  alarm: 0.56,
  lockdown: 0.62
};

type AudioMap = Partial<Record<MusicTrackId, HTMLAudioElement>>;

export function useDynamicMusic(trackId: MusicTrackId | null, enabled: boolean) {
  const audioRef = useRef<AudioMap>({});
  const currentTrackRef = useRef<MusicTrackId | null>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const targetTrackRef = useRef<MusicTrackId | null>(trackId);
  targetTrackRef.current = trackId;

  const ensureAudio = useCallback((id: MusicTrackId) => {
    const existing = audioRef.current[id];
    if (existing) return existing;

    const audio = new Audio(TRACK_SOURCES[id]);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    audioRef.current[id] = audio;
    return audio;
  }, []);

  const stopFade = useCallback(() => {
    if (fadeFrameRef.current !== null) {
      window.cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }
  }, []);

  const fadeTo = useCallback(
    async (nextTrack: MusicTrackId | null) => {
      stopFade();

      if (!nextTrack) {
        const startedAt = performance.now();
        const fadeOut = (now: number) => {
          const progress = fadeProgress({ startedAt, now, durationMs: 450 });
          for (const audio of Object.values(audioRef.current)) {
            if (!audio) continue;
            audio.volume = audio.volume * (1 - progress);
            if (progress >= 1) {
              audio.pause();
              audio.currentTime = 0;
            }
          }
          if (progress < 1) {
            fadeFrameRef.current = window.requestAnimationFrame(fadeOut);
          }
        };
        fadeFrameRef.current = window.requestAnimationFrame(fadeOut);
        currentTrackRef.current = null;
        return;
      }

      const nextAudio = ensureAudio(nextTrack);
      await nextAudio.play().catch(() => undefined);

      const previousTrack = currentTrackRef.current;
      const previousAudio = previousTrack ? audioRef.current[previousTrack] : undefined;
      const startedAt = performance.now();
      const targetVolume = TRACK_VOLUME[nextTrack];

      const fade = (now: number) => {
        const progress = fadeProgress({ startedAt, now, durationMs: 700 });
        nextAudio.volume = targetVolume * progress;

        if (previousAudio && previousAudio !== nextAudio) {
          previousAudio.volume = Math.max(0, TRACK_VOLUME[previousTrack!] * (1 - progress));
          if (progress >= 1) {
            previousAudio.pause();
            previousAudio.currentTime = 0;
          }
        }

        if (progress < 1) {
          fadeFrameRef.current = window.requestAnimationFrame(fade);
        }
      };

      fadeFrameRef.current = window.requestAnimationFrame(fade);
      currentTrackRef.current = nextTrack;
    },
    [ensureAudio, stopFade]
  );

  const unlock = useCallback(async () => {
    const nextTrack = targetTrackRef.current;
    if (!nextTrack) return;
    await fadeTo(nextTrack);
  }, [fadeTo]);

  useEffect(() => {
    if (!enabled) {
      void fadeTo(null);
      return;
    }
    void fadeTo(trackId);
  }, [enabled, fadeTo, trackId]);

  useEffect(() => {
    return () => {
      stopFade();
      for (const audio of Object.values(audioRef.current)) {
        audio?.pause();
      }
    };
  }, [stopFade]);

  return useMemo(() => ({ unlock }), [unlock]);
}
