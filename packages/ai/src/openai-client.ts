import OpenAI from "openai";
import type { GameState, LegalAction } from "@agent-alibi/shared";
import { buildObservation } from "./build-observation";
import type { AIDecision } from "./decision-schema";
import { aiDecisionSchema } from "./decision-schema";
import { getAgentProfile } from "./profiles";

export type OpenAIDecisionOptions = {
  apiKey: string;
  model: string;
  timeoutMs: number;
};

export async function chooseOpenAIDecision(
  state: GameState,
  playerId: string,
  legalActions: LegalAction[],
  options: OpenAIDecisionOptions
): Promise<AIDecision> {
  const observation = buildObservation(state, playerId);
  const player = state.players.find((candidate) => candidate.id === playerId);
  const profile = getAgentProfile(player?.agentProfileId);
  const client = new OpenAI({ apiKey: options.apiKey });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const completion = await client.chat.completions.create(
      {
        model: options.model,
        temperature: profile.riskTolerance === "high" ? 0.85 : 0.55,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an AI player in a cartoon sci-fi heist game. Pick exactly one legal action ID. Return only valid JSON."
          },
          {
            role: "user",
            content: JSON.stringify({
              profile,
              observation,
              legalActions: legalActions.map((action) => ({
                id: action.id,
                label: action.label,
                kind: action.kind,
                risk: action.risk
              })),
              responseShape: {
                publicMessage: "short public table message, max 180 chars",
                chosenActionId: "one legal action id",
                intentSummary: "short reason, max 240 chars",
                confidence: "low | medium | high"
              }
            })
          }
        ]
      },
      { signal: controller.signal }
    );
    const raw = completion.choices[0]?.message.content;
    const parsed = aiDecisionSchema.parse(JSON.parse(raw ?? "{}"));
    if (!legalActions.some((action) => action.id === parsed.chosenActionId)) {
      throw new Error("OpenAI chose an illegal action.");
    }
    return parsed;
  } finally {
    clearTimeout(timeout);
  }
}
