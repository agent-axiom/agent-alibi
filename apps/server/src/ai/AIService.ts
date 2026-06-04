import type { GameState, LegalAction } from "@agent-alibi/shared";
import { chooseFallbackDecision, chooseOpenAIDecision } from "@agent-alibi/ai";

export class AIService {
  private readonly enabled = process.env.ENABLE_OPENAI === "true";
  private readonly apiKey = process.env.OPENAI_API_KEY;
  private readonly model = process.env.AI_DECISION_MODEL ?? "gpt-4.1-mini";
  private readonly timeoutMs = Number(process.env.AI_TIMEOUT_MS ?? 6000);

  async chooseDecision(state: GameState, playerId: string, legalActions: LegalAction[]) {
    const player = state.players.find((candidate) => candidate.id === playerId);
    if (!this.enabled || !this.apiKey) {
      return chooseFallbackDecision(state, playerId, player?.agentProfileId);
    }

    try {
      return await chooseOpenAIDecision(state, playerId, legalActions, {
        apiKey: this.apiKey,
        model: this.model,
        timeoutMs: this.timeoutMs
      });
    } catch {
      return chooseFallbackDecision(state, playerId, player?.agentProfileId);
    }
  }
}
