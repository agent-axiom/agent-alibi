export function sanitizeName(input: string): string {
  return input.replace(/[^\w .-]/g, "").trim().slice(0, 24) || "Agent";
}

export function sanitizeChat(input: string): string {
  return input.replace(/\s+/g, " ").trim().slice(0, 180);
}
