import type { LocalMatchController } from "../local/useLocalMatch";
import { ActionPanel } from "./ActionPanel";
import { BriefingPanel } from "./BriefingPanel";
import { MoonVaultMap } from "./MoonVaultMap";
import { RevealLog } from "./RevealLog";
import { StatusLine } from "./StatusLine";
import { TeamPanel } from "./TeamPanel";

type MatchScreenProps = {
  match: LocalMatchController;
};

export function MatchScreen({ match }: MatchScreenProps) {
  if (!match.state) return null;

  return (
    <main className="match-shell">
      <StatusLine state={match.state} isAiDemo={match.isAiDemo} />
      <section className="match-layout">
        <MoonVaultMap state={match.state} />
        <div className="right-rail">
          <TeamPanel state={match.state} />
          <BriefingPanel messages={match.briefingMessages} />
          <ActionPanel
            actions={match.legalActions}
            isAiDemo={match.isAiDemo}
            onLock={match.lockAction}
            onAdvanceAiOnly={match.advanceAiOnly}
          />
        </div>
      </section>
      <RevealLog events={match.state.revealLog} />
    </main>
  );
}
