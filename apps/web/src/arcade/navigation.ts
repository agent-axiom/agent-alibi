export type ObjectiveDirectionInput = {
  kind: "target" | "exit" | "rival" | "carrier";
  dx: number;
  dy: number;
  distanceMeters: number;
};

const DIRECTIONS = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"] as const;

export function buildObjectiveDirectionLabel(input: ObjectiveDirectionInput): string {
  const prefix = input.kind === "exit" ? "Exit" : input.kind === "rival" ? "Nearest rival" : input.kind === "carrier" ? "Carrier" : "Target";
  if (input.dx === 0 && input.dy === 0) return `${prefix} here ${input.distanceMeters}m`;

  const angle = Math.atan2(input.dy, input.dx);
  const normalized = angle < 0 ? angle + Math.PI * 2 : angle;
  const direction = DIRECTIONS[Math.round(normalized / (Math.PI / 4)) % DIRECTIONS.length];
  return `${prefix} ${direction} ${input.distanceMeters}m`;
}
