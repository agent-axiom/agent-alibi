import { Bot, Radio, Users } from "lucide-react";
import { useState } from "react";
import { FinalCaseFile } from "./game-ui/FinalCaseFile";
import { MatchScreen } from "./game-ui/MatchScreen";
import { HomeScreen } from "./lobby/HomeScreen";
import { useLocalMatch } from "./local/useLocalMatch";

type AppScreen = "home" | "match";

export function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const localMatch = useLocalMatch();

  function startSolo() {
    localMatch.startSolo();
    setScreen("match");
  }

  function startDemo() {
    localMatch.startAiDemo();
    setScreen("match");
  }

  if (screen === "home") {
    return (
      <HomeScreen
        actions={[
          { label: "Play Now vs AI", icon: Bot, onClick: startSolo },
          { label: "Create Room", icon: Users, onClick: startSolo },
          { label: "AI vs AI Demo", icon: Radio, onClick: startDemo }
        ]}
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
