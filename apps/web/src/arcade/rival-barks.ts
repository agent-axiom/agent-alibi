export type RivalBarkEvent = "steal" | "cashout" | "intercept";

type RivalBarkSet = Record<RivalBarkEvent, (relicLabel: string) => string>;

const PERSONALITY_BARKS: Record<string, RivalBarkSet> = {
  Rook: {
    steal: (relicLabel) => `${relicLabel} secured. I already mapped the exit.`,
    cashout: (relicLabel) => `${relicLabel} banked. Planning beats panic.`,
    intercept: () => "Good read. I left you one narrow angle."
  },
  Moth: {
    steal: (relicLabel) => `${relicLabel} moved quiet. You heard nothing.`,
    cashout: (relicLabel) => `${relicLabel} delivered. The silence was the plan.`,
    intercept: () => "I got loud. That was the mistake."
  },
  Vesper: {
    steal: (relicLabel) => `${relicLabel} looks better in red light.`,
    cashout: (relicLabel) => `${relicLabel} sold the lie. The lift believed me.`,
    intercept: () => "That was inconveniently convincing."
  },
  Anchor: {
    steal: (relicLabel) => `${relicLabel} covered. Red crew, stay tight.`,
    cashout: (relicLabel) => `${relicLabel} banked. Crew first, credits second.`,
    intercept: () => "Fair tackle. I should have held formation."
  }
};

const FALLBACK_BARKS: RivalBarkSet = {
  steal: (relicLabel) => `${relicLabel} is mine. Catch the carrier if you can.`,
  cashout: (relicLabel) => `Cashed out ${relicLabel}. Too slow.`,
  intercept: () => "That was almost elegant. Almost."
};

export function buildRivalBarkLine(agentName: string, event: RivalBarkEvent, relicLabel: string): string {
  const barkSet = PERSONALITY_BARKS[agentName] ?? FALLBACK_BARKS;
  return barkSet[event](relicLabel);
}
