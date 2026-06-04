import type { GameState } from "@agent-alibi/shared";

type MoonVaultMapProps = {
  state: GameState;
};

export function MoonVaultMap({ state }: MoonVaultMapProps) {
  return (
    <section className="map-surface" aria-label="Moon Vault map">
      <svg viewBox="0 0 100 100" role="img" aria-label="Moon Vault rooms">
        {state.edges.map((edge) => {
          const from = state.rooms.find((room) => room.id === edge.from);
          const to = state.rooms.find((room) => room.id === edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`${edge.from}-${edge.to}`}
              className={edge.blockedRounds > 0 ? "map-edge blocked" : "map-edge"}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
            />
          );
        })}
        {state.rooms.map((room) => (
          <g key={room.id} className="room-node" transform={`translate(${room.x} ${room.y})`}>
            <circle r={6.5} />
            <text y="-8">{room.name}</text>
          </g>
        ))}
      </svg>
      <div className="room-list">
        {state.rooms.map((room) => {
          const players = state.players.filter((player) => player.locationId === room.id && player.status === "active");
          const artifacts = state.artifacts.filter((artifact) => artifact.roomId === room.id && !artifact.takenBy);
          return (
            <div className="room-row" key={room.id}>
              <span className="room-name">{room.name}</span>
              <span className="room-chips">
                {players.map((player) => (
                  <span className={`chip ${player.teamId}`} key={player.id}>
                    {player.name}
                  </span>
                ))}
                {artifacts.map((artifact) => (
                  <span className="chip artifact" key={artifact.id}>
                    {artifact.name}
                  </span>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
