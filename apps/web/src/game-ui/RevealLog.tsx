import type { RevealEvent } from "@agent-alibi/shared";

type RevealLogProps = {
  events: RevealEvent[];
};

export function RevealLog({ events }: RevealLogProps) {
  return (
    <section className="reveal-strip" aria-label="Reveal log">
      {events.slice(-8).map((event) => (
        <article className={`reveal-event ${event.tone}`} key={event.id}>
          <span>R{event.round}</span>
          <p>{event.text}</p>
        </article>
      ))}
    </section>
  );
}
