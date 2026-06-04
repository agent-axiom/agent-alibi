export type AgentProfile = {
  id: string;
  name: string;
  archetype: "balanced" | "scout" | "chaotic" | "liar" | "loyal";
  riskTolerance: "low" | "medium" | "high";
  teamwork: "low" | "medium" | "high";
  deception: "low" | "medium" | "high";
  speechStyle: string;
};

export const AGENT_PROFILES: AgentProfile[] = [
  {
    id: "rook",
    name: "Rook",
    archetype: "balanced",
    riskTolerance: "medium",
    teamwork: "high",
    deception: "medium",
    speechStyle: "calm strategist with clean tactical language"
  },
  {
    id: "moth",
    name: "Moth",
    archetype: "scout",
    riskTolerance: "low",
    teamwork: "medium",
    deception: "medium",
    speechStyle: "quiet, observant, sparse"
  },
  {
    id: "gremlin",
    name: "Gremlin",
    archetype: "chaotic",
    riskTolerance: "high",
    teamwork: "low",
    deception: "high",
    speechStyle: "reckless, funny, slightly suspicious"
  },
  {
    id: "vesper",
    name: "Vesper",
    archetype: "liar",
    riskTolerance: "medium",
    teamwork: "medium",
    deception: "high",
    speechStyle: "smooth, confident, plausible"
  },
  {
    id: "anchor",
    name: "Anchor",
    archetype: "loyal",
    riskTolerance: "low",
    teamwork: "high",
    deception: "low",
    speechStyle: "steady, protective, direct"
  }
];

export function getAgentProfile(profileId: string | undefined): AgentProfile {
  return AGENT_PROFILES.find((profile) => profile.id === profileId) ?? AGENT_PROFILES[0]!;
}
