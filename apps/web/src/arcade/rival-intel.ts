import type { RivalPressureLevel } from "./guidance";

export type RivalIntelRelic = {
  name: string;
  value: number;
};

export type RivalIntelAgentInput = {
  id: string;
  name: string;
  distanceMeters: number;
  targetLabel: string | null;
  carriedRelic?: RivalIntelRelic | null;
  cashoutSeconds?: number | null;
};

export type RivalIntelInput = {
  rivalsActive: boolean;
  wakeHoldMs: number;
  nearestRivalName: string | null;
  rivalPressureLevel: RivalPressureLevel;
  hunterName: string | null;
  hunterStatus: "hunting" | "waking" | "standby" | null;
  agents: RivalIntelAgentInput[];
  maxCards?: number;
};

export type ArcadeRivalIntelCard = {
  id: string;
  agentName: string;
  role: "Carrier" | "Hunter" | "Scanner" | "Raider";
  tone: "danger" | "warning" | "neutral";
  status: string;
  detail: string;
  action: string;
  distanceMeters: number;
};

type RankedRivalIntelCard = ArcadeRivalIntelCard & {
  priority: number;
};

export function buildRivalIntelCards(input: RivalIntelInput): ArcadeRivalIntelCard[] {
  return input.agents
    .map((agent) => buildRivalIntelCard(agent, input))
    .sort((left, right) => left.priority - right.priority || left.distanceMeters - right.distanceMeters || left.agentName.localeCompare(right.agentName))
    .slice(0, input.maxCards ?? 3)
    .map(({ priority: _priority, ...card }) => card);
}

function buildRivalIntelCard(agent: RivalIntelAgentInput, input: RivalIntelInput): RankedRivalIntelCard {
  const carriedRelic = agent.carriedRelic ?? null;
  if (carriedRelic) {
    const cashoutSeconds = Math.max(1, Math.ceil(agent.cashoutSeconds ?? 1));
    const critical = cashoutSeconds <= 4;
    return {
      id: agent.id,
      agentName: agent.name,
      role: "Carrier",
      tone: critical ? "danger" : "warning",
      status: `${carriedRelic.name} +${carriedRelic.value}`,
      detail: `Cashout in ${cashoutSeconds}s · ${agent.distanceMeters}m`,
      action: critical ? "Intercept now" : "Cut off before lift",
      distanceMeters: agent.distanceMeters,
      priority: 0
    };
  }

  if (agent.name === input.hunterName) {
    const hunting = input.rivalsActive && input.hunterStatus === "hunting";
    return {
      id: agent.id,
      agentName: agent.name,
      role: "Hunter",
      tone: hunting ? "danger" : "warning",
      status: "Marks you",
      detail: hunting ? `Scan lock · ${agent.distanceMeters}m` : `Waking in ${wakeSeconds(input.wakeHoldMs)}s · ${agent.distanceMeters}m`,
      action: hunting ? "Dash or break line" : "Use the head start",
      distanceMeters: agent.distanceMeters,
      priority: 1
    };
  }

  if (agent.name === input.nearestRivalName && input.rivalPressureLevel !== "clear" && input.rivalPressureLevel !== "standby") {
    const danger = input.rivalPressureLevel === "danger";
    return {
      id: agent.id,
      agentName: agent.name,
      role: "Scanner",
      tone: danger ? "danger" : "warning",
      status: "Scan pressure",
      detail: danger ? `On you · ${agent.distanceMeters}m` : `Closing · ${agent.distanceMeters}m`,
      action: "Jam or break line",
      distanceMeters: agent.distanceMeters,
      priority: 2
    };
  }

  const target = agent.targetLabel ?? "vault route";
  return {
    id: agent.id,
    agentName: agent.name,
    role: "Raider",
    tone: input.rivalsActive ? "neutral" : "warning",
    status: `Raiding ${target}`,
    detail: input.rivalsActive ? `${agent.distanceMeters}m route` : `Waking in ${wakeSeconds(input.wakeHoldMs)}s · ${agent.distanceMeters}m`,
    action: input.rivalsActive ? "Beat them to loot" : "Use the head start",
    distanceMeters: agent.distanceMeters,
    priority: 3
  };
}

function wakeSeconds(wakeHoldMs: number): number {
  return Math.max(1, Math.ceil(wakeHoldMs / 1000));
}
