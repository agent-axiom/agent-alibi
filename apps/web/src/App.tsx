import { Bot, Radio, Users } from "lucide-react";
import { useState } from "react";
import { selectMusicTrack } from "./arcade/music";
import { useDynamicMusic } from "./audio/useDynamicMusic";
import { useMissionStingers } from "./audio/useMissionStingers";
import { buildActionCards } from "./game-ui/action-cards";
import { FinalCaseFile } from "./game-ui/FinalCaseFile";
import { MatchScreen } from "./game-ui/MatchScreen";
import { HomeScreen } from "./lobby/HomeScreen";
import { RoomScreen } from "./lobby/RoomScreen";
import { useLocalMatch } from "./local/useLocalMatch";
import { useOnlineRoom } from "./socket/useOnlineRoom";

type AppScreen = "home" | "match" | "room";

export function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [onlineSelectedActionId, setOnlineSelectedActionId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const localMatch = useLocalMatch();
  const onlineRoom = useOnlineRoom();
  const arcadeHud = localMatch.arcade?.hud;
  const effectiveMusicScreen = localMatch.summary || onlineRoom.summary ? "final" : screen;
  const musicTrack = selectMusicTrack({
    screen: effectiveMusicScreen,
    isArcade: Boolean(localMatch.arcade?.enabled),
    alarm: arcadeHud?.alarm ?? localMatch.state?.alarm,
    timeLeftMs: arcadeHud?.timeLeftMs
  });
  const music = useDynamicMusic(musicTrack, soundEnabled);
  useMissionStingers({
    enabled: soundEnabled,
    hud: arcadeHud,
    summary: localMatch.summary ?? onlineRoom.summary
  });

  async function enableSound() {
    setSoundEnabled(true);
    await music.unlock();
  }

  function toggleSound() {
    const nextEnabled = !soundEnabled;
    setSoundEnabled(nextEnabled);
    if (nextEnabled) {
      void music.unlock();
    }
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
          { label: "Play Now vs AI", icon: Bot, onClick: startSolo },
          { label: "Create Room", icon: Users, onClick: createRoom },
          { label: "AI vs AI Demo", icon: Radio, onClick: startDemo }
        ]}
        soundEnabled={soundEnabled}
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
        onStart={onlineRoom.startMatch}
      />
    );
  }

  if (localMatch.summary) {
    return (
      <FinalCaseFile
        summary={localMatch.summary}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onRematch={startSolo}
        onHome={() => {
          localMatch.reset();
          setScreen("home");
        }}
      />
    );
  }

  return <MatchScreen match={localMatch} soundEnabled={soundEnabled} onToggleSound={toggleSound} />;
}
