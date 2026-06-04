import type { ArtifactState, MapEdge, Room } from "@agent-alibi/shared";

export const MOON_VAULT_ROOMS: Room[] = [
  { id: "atrium", name: "Atrium", x: 50, y: 78, danger: 0 },
  { id: "east-hall", name: "East Hall", x: 72, y: 56, danger: 1 },
  { id: "moon-gallery", name: "Moon Gallery", x: 88, y: 34, danger: 2 },
  { id: "guard-post", name: "Guard Post", x: 91, y: 68, danger: 2 },
  { id: "west-hall", name: "West Hall", x: 28, y: 56, danger: 1 },
  { id: "silver-archive", name: "Silver Archive", x: 12, y: 34, danger: 1 },
  { id: "crystal-lift", name: "Crystal Lift", x: 10, y: 72, danger: 1 },
  { id: "vault-door", name: "Vault Door", x: 50, y: 42, danger: 2 },
  { id: "inner-vault", name: "Inner Vault", x: 50, y: 18, danger: 3 }
];

export const MOON_VAULT_EDGES: MapEdge[] = [
  { from: "atrium", to: "east-hall", blockedRounds: 0 },
  { from: "east-hall", to: "moon-gallery", blockedRounds: 0 },
  { from: "east-hall", to: "guard-post", blockedRounds: 0 },
  { from: "atrium", to: "west-hall", blockedRounds: 0 },
  { from: "west-hall", to: "silver-archive", blockedRounds: 0 },
  { from: "west-hall", to: "crystal-lift", blockedRounds: 0 },
  { from: "atrium", to: "vault-door", blockedRounds: 0 },
  { from: "vault-door", to: "inner-vault", blockedRounds: 0 }
];

export const MOON_VAULT_EXITS = ["atrium", "crystal-lift"];

export const MOON_VAULT_ARTIFACTS: ArtifactState[] = [
  { id: "moon-pearl", name: "Moon Pearl", roomId: "moon-gallery", value: 3, size: "major" },
  { id: "argent-crown", name: "Argent Crown", roomId: "inner-vault", value: 3, size: "major" },
  { id: "silver-key", name: "Silver Key", roomId: "silver-archive", value: 1, size: "minor" },
  { id: "crystal-ledger", name: "Crystal Ledger", roomId: "guard-post", value: 1, size: "minor" },
  { id: "star-map", name: "Star Map", roomId: "vault-door", value: 1, size: "minor" }
];

export function cloneMoonVaultArtifacts(): ArtifactState[] {
  return MOON_VAULT_ARTIFACTS.map((artifact) => ({ ...artifact }));
}

export function cloneMoonVaultEdges(): MapEdge[] {
  return MOON_VAULT_EDGES.map((edge) => ({ ...edge }));
}

export function cloneMoonVaultRooms(): Room[] {
  return MOON_VAULT_ROOMS.map((room) => ({ ...room }));
}
