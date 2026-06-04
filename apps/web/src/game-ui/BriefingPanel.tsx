type BriefingMessage = {
  id: string;
  playerName: string;
  text: string;
};

type BriefingPanelProps = {
  messages: BriefingMessage[];
};

export function BriefingPanel({ messages }: BriefingPanelProps) {
  return (
    <section className="panel briefing-panel" aria-label="Briefing">
      <div className="panel-heading">
        <h2>Briefing</h2>
      </div>
      <div className="briefing-list">
        {messages.map((message) => (
          <p key={message.id}>
            <strong>{message.playerName}</strong>
            <span>{message.text.replace(`${message.playerName}: `, "")}</span>
          </p>
        ))}
      </div>
    </section>
  );
}
