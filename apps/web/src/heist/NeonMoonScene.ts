import Phaser from "phaser";
import type { ArtifactState, GameState, PlayerState, RevealEvent, Room } from "@agent-alibi/shared";
import type { HeistSceneSnapshot } from "./scene-types";

const TEAM_COLORS = {
  blue: 0x4cf4f0,
  red: 0xff4f7b
} as const;

const ROOM_ACCENTS: Record<string, number> = {
  atrium: 0x68f5d5,
  "east-hall": 0x91a7ff,
  "moon-gallery": 0xffd56a,
  "guard-post": 0xff6680,
  "west-hall": 0x91a7ff,
  "silver-archive": 0xffd56a,
  "crystal-lift": 0x73ffd3,
  "vault-door": 0xbda9ff,
  "inner-vault": 0xffd56a
};

export class NeonMoonScene extends Phaser.Scene {
  private snapshot?: HeistSceneSnapshot;

  constructor() {
    super("neon-moon");
  }

  create() {
    this.scale.on("resize", () => this.redraw());
    this.redraw();
  }

  updateSnapshot(snapshot: HeistSceneSnapshot) {
    this.snapshot = snapshot;
    if (this.sys.isActive()) {
      this.redraw();
    }
  }

  private redraw() {
    this.tweens.killAll();
    this.children.removeAll(true);

    const width = Math.max(320, this.scale.width);
    const height = Math.max(320, this.scale.height);
    this.drawBackdrop(width, height);

    if (!this.snapshot) {
      this.drawBootMessage(width, height);
      return;
    }

    this.drawVault(this.snapshot.state, width, height);
    this.drawAlarm(this.snapshot.state, width, height);
    this.drawRevealBeat(this.snapshot.latestEvents, width, height);
    this.drawLaserSweep(width, height);
  }

  private drawBackdrop(width: number, height: number) {
    const bg = this.add.graphics();
    bg.fillStyle(0x060915, 1);
    bg.fillRect(0, 0, width, height);

    const glow = this.add.graphics();
    glow.fillStyle(0x11264a, 0.42);
    glow.fillCircle(width * 0.5, height * 0.42, Math.min(width, height) * 0.52);
    glow.fillStyle(0x3b1028, 0.26);
    glow.fillCircle(width * 0.77, height * 0.68, Math.min(width, height) * 0.34);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x6cecff, 0.08);
    const spacing = Math.max(28, Math.min(width, height) / 18);
    for (let x = 0; x <= width; x += spacing) {
      grid.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += spacing) {
      grid.lineBetween(0, y, width, y);
    }
  }

  private drawBootMessage(width: number, height: number) {
    this.add
      .text(width / 2, height / 2, "LINKING TO MOON VAULT", {
        color: "#d7fbff",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "18px",
        fontStyle: "700"
      })
      .setOrigin(0.5);
  }

  private drawVault(state: GameState, width: number, height: number) {
    const corridors = this.add.graphics();
    corridors.lineStyle(Math.max(8, width * 0.012), 0xb9f6ff, 0.22);
    for (const edge of state.edges) {
      const from = state.rooms.find((room) => room.id === edge.from);
      const to = state.rooms.find((room) => room.id === edge.to);
      if (!from || !to) continue;
      const fromPoint = this.roomPoint(from, width, height);
      const toPoint = this.roomPoint(to, width, height);
      corridors.lineBetween(fromPoint.x, fromPoint.y, toPoint.x, toPoint.y);
      if (edge.blockedRounds > 0) {
        const midX = (fromPoint.x + toPoint.x) / 2;
        const midY = (fromPoint.y + toPoint.y) / 2;
        this.add.circle(midX, midY, 17, 0xff4f7b, 0.34).setStrokeStyle(2, 0xffd1dc, 0.85);
        this.add
          .text(midX, midY, "X", {
            color: "#fff3f6",
            fontFamily: "Inter, Arial, sans-serif",
            fontSize: "18px",
            fontStyle: "900"
          })
          .setOrigin(0.5);
      }
    }

    for (const room of state.rooms) {
      this.drawRoom(state, room, width, height);
    }

    for (const player of state.players) {
      this.drawAgent(state, player, width, height);
    }
  }

  private drawRoom(state: GameState, room: Room, width: number, height: number) {
    const point = this.roomPoint(room, width, height);
    const roomWidth = Phaser.Math.Clamp(width * 0.105, 78, 132);
    const roomHeight = Phaser.Math.Clamp(height * 0.072, 46, 76);
    const accent = ROOM_ACCENTS[room.id] ?? 0xb9f6ff;

    const halo = this.add.graphics();
    halo.fillStyle(accent, 0.18);
    halo.fillRoundedRect(point.x - roomWidth / 2 - 9, point.y - roomHeight / 2 - 9, roomWidth + 18, roomHeight + 18, 12);

    const panel = this.add.graphics();
    panel.fillStyle(0x101827, 0.94);
    panel.fillRoundedRect(point.x - roomWidth / 2, point.y - roomHeight / 2, roomWidth, roomHeight, 8);
    panel.lineStyle(2, accent, 0.85);
    panel.strokeRoundedRect(point.x - roomWidth / 2, point.y - roomHeight / 2, roomWidth, roomHeight, 8);

    this.add
      .text(point.x, point.y - roomHeight / 2 - 17, room.name.toUpperCase(), {
        color: "#dffcff",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "900",
        stroke: "#060915",
        strokeThickness: 4
      })
      .setOrigin(0.5);

    const artifacts = artifactsInRoom(state, room.id);
    artifacts.forEach((artifact, index) => {
      this.drawArtifact(point.x + (index - (artifacts.length - 1) / 2) * 24, point.y + 4, artifact);
    });
  }

  private drawArtifact(x: number, y: number, artifact: ArtifactState) {
    const size = artifact.size === "major" ? 13 : 10;
    const color = artifact.size === "major" ? 0xff4f7b : 0xffd56a;
    const gem = this.add.polygon(x, y, [
      { x: 0, y: -size },
      { x: size, y: 0 },
      { x: 0, y: size },
      { x: -size, y: 0 }
    ], color, 0.95);
    gem.setStrokeStyle(3, 0xf8fdff, 0.82);
    this.tweens.add({
      targets: gem,
      scale: { from: 0.94, to: 1.08 },
      duration: 920,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  private drawAgent(state: GameState, player: PlayerState, width: number, height: number) {
    const room = state.rooms.find((candidate) => candidate.id === player.locationId);
    if (!room) return;
    const point = this.roomPoint(room, width, height);
    const offset = agentOffset(state.players.filter((candidate) => candidate.locationId === player.locationId), player.id);
    const x = point.x + offset.x;
    const y = point.y + offset.y;
    const color = TEAM_COLORS[player.teamId];
    const alpha = player.status === "active" ? 1 : 0.45;
    const selected = this.snapshot?.selectedPlayerId === player.id;

    this.add.circle(x, y, selected ? 24 : 19, color, selected ? 0.2 : 0.11);
    const ring = this.add.circle(x, y, 16, 0x07101c, alpha).setStrokeStyle(3, color, alpha);
    this.add.circle(x, y, 9, color, alpha);
    this.add.circle(x + 3, y - 3, 3, 0xffffff, alpha * 0.72);

    this.add
      .text(x, y + 27, shortName(player.name), {
        color: "#f8fdff",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "900",
        stroke: "#060915",
        strokeThickness: 4
      })
      .setOrigin(0.5);

    if (player.inventory.length > 0) {
      this.add.circle(x + 15, y - 14, 5, 0xffd56a, alpha);
    }

    this.tweens.add({
      targets: ring,
      alpha: { from: 0.76 * alpha, to: 1 * alpha },
      duration: 740,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  private drawAlarm(state: GameState, width: number, height: number) {
    const x = width - 170;
    const y = 26;
    const panel = this.add.graphics();
    panel.fillStyle(0x07101c, 0.76);
    panel.fillRoundedRect(x, y, 142, 54, 8);
    panel.lineStyle(1, 0x96f6ff, 0.28);
    panel.strokeRoundedRect(x, y, 142, 54, 8);

    this.add.text(x + 14, y + 10, "ALARM", {
      color: "#dffcff",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "11px",
      fontStyle: "900"
    });

    for (let index = 0; index < 5; index += 1) {
      const lit = index < state.alarm;
      const dot = this.add.rectangle(x + 18 + index * 22, y + 36, 16, 7, lit ? 0xff4f7b : 0x526073, lit ? 1 : 0.55);
      dot.setStrokeStyle(1, lit ? 0xffb8c8 : 0x7d8ba0, 0.6);
    }
  }

  private drawRevealBeat(events: RevealEvent[], width: number, height: number) {
    const event = events.at(-1);
    if (!event) return;
    const color = event.tone === "success" ? "#7effdf" : event.tone === "danger" || event.tone === "betrayal" ? "#ff8fa5" : "#dffcff";

    const panel = this.add.graphics();
    panel.fillStyle(0x07101c, 0.82);
    panel.fillRoundedRect(26, height - 105, Math.min(width - 52, 740), 78, 8);
    panel.lineStyle(1, event.tone === "success" ? 0x7effdf : event.tone === "info" ? 0x96f6ff : 0xff8fa5, 0.55);
    panel.strokeRoundedRect(26, height - 105, Math.min(width - 52, 740), 78, 8);

    this.add.text(44, height - 91, `ROUND ${event.round}`, {
      color: "#ffd56a",
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "11px",
      fontStyle: "900"
    });
    this.add.text(44, height - 68, event.text, {
      color,
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: "18px",
      fontStyle: "800",
      wordWrap: { width: Math.min(width - 88, 680) }
    });
  }

  private drawLaserSweep(width: number, height: number) {
    const sweep = this.add.rectangle(-80, height * 0.5, 120, height * 1.35, 0x78f7ff, 0.06).setAngle(-18);
    this.tweens.add({
      targets: sweep,
      x: width + 110,
      duration: 4600,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  private roomPoint(room: Room, width: number, height: number): { x: number; y: number } {
    return {
      x: width * (0.12 + room.x / 100 * 0.76),
      y: height * (0.17 + room.y / 100 * 0.68)
    };
  }
}

function artifactsInRoom(state: GameState, roomId: string): ArtifactState[] {
  return state.artifacts.filter((artifact) => artifact.roomId === roomId && !artifact.takenBy);
}

function agentOffset(playersInRoom: PlayerState[], playerId: string): { x: number; y: number } {
  const index = Math.max(0, playersInRoom.findIndex((player) => player.id === playerId));
  const offsets = [
    { x: -18, y: -12 },
    { x: 18, y: -12 },
    { x: -18, y: 18 },
    { x: 18, y: 18 },
    { x: 0, y: 0 },
    { x: 0, y: -28 }
  ];
  return offsets[index % offsets.length]!;
}

function shortName(name: string): string {
  if (name.toLowerCase().includes("you")) return "YOU";
  return name.slice(0, 3).toUpperCase();
}
