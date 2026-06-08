import { Bot, Radio, Users } from "lucide-react";
import { useState } from "react";
import { selectMusicTrack } from "./arcade/music";
import { useDynamicMusic } from "./audio/useDynamicMusic";
import { useMissionStingers } from "./audio/useMissionStingers";
import { buildActionCards } from "./game-ui/action-cards";
import { FinalCaseFile } from "./game-ui/FinalCaseFile";
import type { Locale } from "./i18n";
import { readStoredLocale, t, writeStoredLocale } from "./i18n";
import { MatchScreen } from "./game-ui/MatchScreen";
import { HomeScreen } from "./lobby/HomeScreen";
import { RoomScreen } from "./lobby/RoomScreen";
import { useLocalMatch } from "./local/useLocalMatch";
import { useOnlineRoom } from "./socket/useOnlineRoom";

type AppScreen = "home" | "match" | "room";

const SOUND_PREFERENCE_STORAGE_KEY = "agent-alibi:sound-enabled:v1";

export function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [onlineSelectedActionId, setOnlineSelectedActionId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(readStoredSoundPreference);
  const [locale, setLocale] = useState<Locale>(readStoredLocale);
  const localMatch = useLocalMatch();
  const onlineRoom = useOnlineRoom();
  const arcadeHud = localMatch.arcade?.hud;
  const effectiveMusicScreen = localMatch.summary || onlineRoom.summary ? "final" : screen;
  const musicTrack = selectMusicTrack({
    screen: effectiveMusicScreen,
    isArcade: Boolean(localMatch.arcade?.enabled),
    alarm: arcadeHud?.alarm ?? localMatch.state?.alarm,
    timeLeftMs: arcadeHud?.timeLeftMs,
    boostActive: Boolean(arcadeHud?.lootSpeedSurge),
    rivalPressureActive: Boolean((arcadeHud?.aiLootValue ?? 0) > 0 || arcadeHud?.rivalIntercept || arcadeHud?.lastRivalSteal),
    rivalCarrierCritical: arcadeHud?.rivalIntercept?.urgency === "critical"
  });
  const music = useDynamicMusic(musicTrack, soundEnabled);
  useMissionStingers({
    enabled: soundEnabled,
    hud: arcadeHud,
    summary: localMatch.summary ?? onlineRoom.summary
  });

  async function enableSound() {
    updateSoundPreference(true);
    await music.unlock();
  }

  function toggleSound() {
    const nextEnabled = !soundEnabled;
    updateSoundPreference(nextEnabled);
    if (nextEnabled) {
      void music.unlock();
    }
  }

  function updateSoundPreference(nextEnabled: boolean) {
    setSoundEnabled(nextEnabled);
    writeStoredSoundPreference(nextEnabled);
  }

  function updateLocale(nextLocale: Locale) {
    setLocale(nextLocale);
    writeStoredLocale(nextLocale);
  }

  function startSolo() {
    void enableSound();
    localMatch.startSolo();
    setScreen("match");
  }

  function startDemo() {
    void enableSound();
    localMatch.startAiDemo();
    setScreen("match");
  }

  function createRoom() {
    void enableSound();
    setOnlineSelectedActionId(null);
    onlineRoom.connect();
    onlineRoom.createRoom("Agent You");
    setScreen("room");
  }

  if (screen === "home") {
    return (
      <HomeScreen
        actions={[
          { label: t(locale, "home.playNow"), icon: Bot, onClick: startSolo },
          { label: t(locale, "home.createRoom"), icon: Users, onClick: createRoom },
          { label: t(locale, "home.aiDemo"), icon: Radio, onClick: startDemo }
        ]}
        soundEnabled={soundEnabled}
        locale={locale}
        onLocaleChange={updateLocale}
        onToggleSound={toggleSound}
      />
    );
  }

  if (screen === "room") {
    if (onlineRoom.summary) {
      return (
        <FinalCaseFile
          summary={onlineRoom.summary}
          soundEnabled={soundEnabled}
          locale={locale}
          onLocaleChange={updateLocale}
          onToggleSound={toggleSound}
          onRematch={onlineRoom.startMatch}
          onHome={() => setScreen("home")}
        />
      );
    }
    if (onlineRoom.state) {
      const onlineActionCards = buildActionCards(onlineRoom.state, onlineRoom.legalActions);
      const executeOnlineAction = () => {
        const actionId = onlineSelectedActionId ?? onlineActionCards[0]?.actionId;
        if (!actionId) return;
        onlineRoom.lockAction(actionId);
        setOnlineSelectedActionId(null);
      };
      return (
        <MatchScreen
          match={{
            state: onlineRoom.state,
            legalActions: onlineRoom.legalActions,
            actionCards: onlineActionCards,
            briefingMessages: [],
            lastEvents: onlineRoom.state.revealLog.slice(-3),
            summary: onlineRoom.summary,
            isAiDemo: false,
            selectedActionId: onlineSelectedActionId,
            selectedPlayerId: undefined,
            startSolo,
            startAiDemo: startDemo,
            selectAction: setOnlineSelectedActionId,
            selectPlayer: () => undefined,
            executeSelectedAction: executeOnlineAction,
            lockAction: onlineRoom.lockAction,
            advanceAiOnly: onlineRoom.startMatch,
            reset: () => setScreen("home")
          }}
          soundEnabled={soundEnabled}
          locale={locale}
          onLocaleChange={updateLocale}
          onToggleSound={toggleSound}
        />
      );
    }
    return (
      <RoomScreen
        room={onlineRoom.room}
        state={onlineRoom.state}
        legalActions={onlineRoom.legalActions}
        error={onlineRoom.error}
        onAddAi={onlineRoom.addAi}
        onRemoveAi={onlineRoom.removeAi}
        locale={locale}
        onLocaleChange={updateLocale}
        onStart={onlineRoom.startMatch}
      />
    );
  }

  if (localMatch.summary) {
    return (
      <FinalCaseFile
        summary={localMatch.summary}
        soundEnabled={soundEnabled}
        locale={locale}
        onLocaleChange={updateLocale}
        onToggleSound={toggleSound}
        onRematch={startSolo}
        onHome={() => {
          localMatch.reset();
          setScreen("home");
        }}
      />
    );
  }

  return <MatchScreen match={localMatch} soundEnabled={soundEnabled} locale={locale} onLocaleChange={updateLocale} onToggleSound={toggleSound} />;
}

function readStoredSoundPreference(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SOUND_PREFERENCE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeStoredSoundPreference(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_PREFERENCE_STORAGE_KEY, enabled ? "true" : "false");
  } catch {
    // Sound remains controllable even when storage is blocked.
  }
}
