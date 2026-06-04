import type { ActionKind, ActionRisk, LegalAction } from "@agent-alibi/shared";

type CreateActionInput = {
  actorId: string;
  kind: ActionKind;
  label: string;
  risk: ActionRisk;
  payload?: Record<string, string>;
};

export function createAction(input: CreateActionInput): LegalAction {
  const payload = input.payload ?? {};
  return {
    id: buildActionId(input.actorId, input.kind, payload),
    actorId: input.actorId,
    kind: input.kind,
    label: input.label,
    risk: input.risk,
    payload
  };
}

function buildActionId(actorId: string, kind: ActionKind, payload: Record<string, string>): string {
  const suffix = Object.entries(payload)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}-${value}`)
    .join(":");
  return suffix.length > 0 ? `${actorId}:${kind}:${suffix}` : `${actorId}:${kind}`;
}
