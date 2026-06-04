import type { ActionKind, ActionRisk, GameState, LegalAction } from "@agent-alibi/shared";

export type ActionCardRole = "objective" | "social" | "risk";

export type ActionCard = {
  id: string;
  actionId: string;
  role: ActionCardRole;
  kind: ActionKind;
  risk: ActionRisk;
  title: string;
  detail: string;
};

const ROLE_ORDER: ActionCardRole[] = ["objective", "social", "risk"];

export function buildActionCards(state: GameState, legalActions: LegalAction[]): ActionCard[] {
  const selectedCards = ROLE_ORDER.map((role) => bestCardForRole(state, legalActions, role)).filter(
    (card): card is ActionCard => Boolean(card)
  );
  const seen = new Set<string>();
  return selectedCards.filter((card) => {
    if (seen.has(card.actionId)) return false;
    seen.add(card.actionId);
    return true;
  });
}

function bestCardForRole(state: GameState, actions: LegalAction[], role: ActionCardRole): ActionCard | undefined {
  const ranked = actions
    .map((action) => ({ action, score: scoreActionForRole(state, action, role) }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.action.label.localeCompare(right.action.label));
  const chosen = ranked[0]?.action;
  return chosen ? toCard(chosen, role) : undefined;
}

function scoreActionForRole(state: GameState, action: LegalAction, role: ActionCardRole): number {
  if (role === "objective") {
    if (action.kind === "steal") return 100;
    if (action.kind === "escape" && (state.round >= state.maxRounds - 1 || state.alarm >= 4)) return 90;
    if (action.kind === "move") return 60;
    if (action.kind === "scout") return 35;
  }

  if (role === "social") {
    if (action.kind === "cover") return 95;
    if (action.kind === "distract") return 85;
    if (action.kind === "guard") return 40;
  }

  if (role === "risk") {
    if (action.kind === "sabotage") return 95;
    if (action.kind === "steal" && action.risk === "high") return 80;
    if (action.kind === "guard") return 35;
  }

  return 0;
}

function toCard(action: LegalAction, role: ActionCardRole): ActionCard {
  return {
    id: `${role}:${action.id}`,
    actionId: action.id,
    role,
    kind: action.kind,
    risk: action.risk,
    title: titleFor(action, role),
    detail: action.label
  };
}

function titleFor(action: LegalAction, role: ActionCardRole): string {
  if (action.kind === "steal") return "Take the prize";
  if (action.kind === "move") return "Slip through";
  if (action.kind === "cover") return "Forge alibi";
  if (action.kind === "distract") return "Sell a lie";
  if (action.kind === "sabotage") return "Break the route";
  if (action.kind === "escape") return "Run for the hatch";
  if (action.kind === "guard") return role === "risk" ? "Hold the line" : "Stand watch";
  return "Scan the vault";
}
