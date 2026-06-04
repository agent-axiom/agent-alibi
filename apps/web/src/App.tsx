import { Bot, Radio, Users } from "lucide-react";
import { useState } from "react";
import { FinalCaseFile } from "./game-ui/FinalCaseFile";
import { MatchScreen } from "./game-ui/MatchScreen";
import { HomeScreen } from "./lobby/HomeScreen";
import { RoomScreen } from "./lobby/RoomScreen";
import { useLocalMatch } from "./local/useLocalMatch";
import { useOnlineRoom } from "./socket/useOnlineRoom";

type AppScreen = "home" | "match" | "room";

export function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const localMatch = useLocalMatch();
  const onlineRoom = useOnlineRoom();

  function startSolo() {
    localMatch.startSolo();
    setScreen("match");
  }

  function startDemo() {
    localMatch.startAiDemo();
    setScreen("match");
  }

  function createRoom() {
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
      />
    );
  }

  if (screen === "room") {
    if (onlineRoom.summary) {
      return <FinalCaseFile summary={onlineRoom.summary} onRematch={onlineRoom.startMatch} onHome={() => setScreen("home")} />;
    }
    if (onlineRoom.state) {
      return (
        <MatchScreen
          match={{
            state: onlineRoom.state,
            legalActions: onlineRoom.legalActions,
            briefingMessages: [],
            summary: onlineRoom.summary,
            isAiDemo: false,
            startSolo,
            startAiDemo: startDemo,
            lockAction: onlineRoom.lockAction,
            advanceAiOnly: onlineRoom.startMatch,
            reset: () => setScreen("home")
          }}
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
        onRematch={startSolo}
        onHome={() => {
          localMatch.reset();
          setScreen("home");
        }}
      />
    );
  }

  return <MatchScreen match={localMatch} />;
}
