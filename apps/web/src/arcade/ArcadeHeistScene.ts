import Phaser from "phaser";
import type { ArtifactState, GameState, PlayerState, Room, TeamId } from "@agent-alibi/shared";
import { ARCADE_MISSION_DURATION_MS, type ArcadeHudPhase, type ArcadeHudState, type ArcadeMissionConfig } from "./arcade-types";

const WORLD_WIDTH = 1680;
const WORLD_HEIGHT = 1040;
const PLAYER_SPEED = 285;
const DASH_SPEED = 620;
const AI_SPEED = 150;
const PICKUP_RADIUS = 42;
const EXIT_RADIUS = 74;
const DASH_COOLDOWN_MS = 1150;

const TEAM_COLORS: Record<TeamId, number> = {
  blue: 0x4cf4f0,
  red: 0xff4f7b
};

type RuntimeArtifact = {
  id: string;
  name: string;
  roomId: string;
  value: number;
  size: ArtifactState["size"];
  x: number;
  y: number;
  takenBy?: string;
  gem: Phaser.GameObjects.Polygon;
  label: Phaser.GameObjects.Text;
};

type RuntimeAgent = {
  id: string;
  name: string;
  teamId: TeamId;
  x: number;
  y: number;
  targetRoomId: string;
  lootValue: number;
  body: Phaser.GameObjects.Container;
  dot: Phaser.GameObjects.Arc;
};

type MovementKeys = {
  w: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
  shift: Phaser.Input.Keyboard.Key;
  e: Phaser.Input.Keyboard.Key;
  space: Phaser.Input.Keyboard.Key;
};

export class ArcadeHeistScene extends Phaser.Scene {
  private config?: ArcadeMissionConfig;
  private state?: GameState;
  private rooms = new Map<string, { room: Room; x: number; y: number }>();
  private artifacts: RuntimeArtifact[] = [];
  private aiAgents: RuntimeAgent[] = [];
  private player?: RuntimeAgent;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys?: MovementKeys;
  private pointerTarget?: Phaser.Math.Vector2;
  private elapsedMs = 0;
  private alarm = 1;
  private dashCooldownMs = 0;
  private lootValue = 0;
  private artifactsStolen = 0;
  private aiLootValue = 0;
  private lastHudAt = -1;
  private feed: string[] = [];
  private finished = false;
  private playerName = "Agent You";
  private escapeZone?: Phaser.GameObjects.Container;

  constructor() {
    super("arcade-heist");
  }

  create() {
    this.cameras.main.setBackgroundColor("#050811");
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.pointerTarget = new Phaser.Math.Vector2(worldPoint.x, worldPoint.y);
    });
    this.cursors = this.input.keyboard?.createCursorKeys();
    const keys = this.input.keyboard?.addKeys("W,A,S,D,SHIFT,E,SPACE") as MovementKeys | undefined;
    this.keys = keys;

    if (this.config) {
      this.startMission(this.config);
    }
  }

  setMissionConfig(config: ArcadeMissionConfig) {
    this.config = config;
    if (this.sys.isActive()) {
      this.startMission(config);
    }
  }

  finishForDebug() {
    if (this.finished) return;
    this.finish("escaped");
  }

  override update(_time: number, delta: number) {
    if (!this.state || !this.player || this.finished) return;

    this.elapsedMs += delta;
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - delta);

    this.updatePlayer(delta);
    this.updateAi(delta);
    this.checkArtifactPickups();
    this.updateAlarm(delta);
    this.checkEscape();
    this.emitHudIfNeeded(false);

    if (this.elapsedMs >= ARCADE_MISSION_DURATION_MS) {
      this.finish(this.lootValue > 0 && this.isNearExit() ? "escaped" : "sealed");
    }
  }

  private startMission(config: ArcadeMissionConfig) {
    this.config = config;
    this.state = config.state;
    this.rooms.clear();
    this.artifacts = [];
    this.aiAgents = [];
    this.player = undefined;
    this.pointerTarget = undefined;
    this.elapsedMs = 0;
    this.alarm = 1;
    this.dashCooldownMs = 0;
    this.lootValue = 0;
    this.artifactsStolen = 0;
    this.aiLootValue = 0;
    this.lastHudAt = -1;
    this.feed = ["Moon Vault breach started.", "Move fast. Steal clean. Escape before lockdown."];
    this.finished = false;
    this.playerName = config.state.players.find((player) => player.kind === "human")?.name ?? "Agent You";

    this.tweens.killAll();
    this.children.removeAll(true);
    this.drawWorld(config.state);
    this.createActors(config.state);
    this.resizeCamera();
    this.scale.off("resize", this.resizeCamera, this);
    this.scale.on("resize", this.resizeCamera, this);
    this.emitHudIfNeeded(true);
  }

  private drawWorld(state: GameState) {
    const bg = this.add.graphics();
    bg.fillStyle(0x050811, 1);
    bg.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    const grid = this.add.graphics();
    grid.lineStyle(1, 0x7efcff, 0.06);
    for (let x = 0; x <= WORLD_WIDTH; x += 64) grid.lineBetween(x, 0, x, WORLD_HEIGHT);
    for (let y = 0; y <= WORLD_HEIGHT; y += 64) grid.lineBetween(0, y, WORLD_WIDTH, y);

    for (const room of state.rooms) {
      this.rooms.set(room.id, {
        room,
        x: 210 + (room.x / 100) * 1260,
        y: 155 + (room.y / 100) * 730
      });
    }

    const corridors = this.add.graphics();
    corridors.lineStyle(54, 0x1a2740, 0.94);
    for (const edge of state.edges) {
      const from = this.rooms.get(edge.from);
      const to = this.rooms.get(edge.to);
      if (!from || !to) continue;
      corridors.lineBetween(from.x, from.y, to.x, to.y);
    }
    corridors.lineStyle(4, 0x7efcff, 0.18);
    for (const edge of state.edges) {
      const from = this.rooms.get(edge.from);
      const to = this.rooms.get(edge.to);
      if (!from || !to) continue;
      corridors.lineBetween(from.x, from.y, to.x, to.y);
    }

    for (const { room, x, y } of this.rooms.values()) {
      this.drawRoom(room, x, y);
    }

    this.createArtifacts(state);
    this.createEscapeZone();
  }

  private drawRoom(room: Room, x: number, y: number) {
    const danger = Phaser.Math.Clamp(room.danger, 0, 4);
    const accent = danger >= 3 ? 0xff4f7b : room.id.includes("vault") ? 0xffd56a : 0x4cf4f0;
    const width = room.id === "inner-vault" ? 230 : 190;
    const height = room.id === "inner-vault" ? 138 : 112;

    const halo = this.add.rectangle(x, y, width + 34, height + 34, accent, 0.08);
    halo.setStrokeStyle(2, accent, 0.28);

    const panel = this.add.rectangle(x, y, width, height, 0x101827, 0.96);
    panel.setStrokeStyle(3, accent, 0.7);

    this.add
      .text(x, y - height / 2 - 22, room.name.toUpperCase(), {
        color: "#dffcff",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "15px",
        fontStyle: "900",
        stroke: "#050811",
        strokeThickness: 5
      })
      .setOrigin(0.5);
  }

  private createArtifacts(state: GameState) {
    const roomCounts = new Map<string, number>();
    this.artifacts = state.artifacts.map((artifact) => {
      const room = this.rooms.get(artifact.roomId) ?? this.rooms.get("atrium")!;
      const index = roomCounts.get(artifact.roomId) ?? 0;
      roomCounts.set(artifact.roomId, index + 1);
      const x = room.x + (index - 0.5) * 38;
      const y = room.y + 10 + (index % 2) * 22;
      const size = artifact.size === "major" ? 20 : 15;
      const color = artifact.size === "major" ? 0xff4f7b : 0xffd56a;
      const gem = this.add.polygon(x, y, [
        { x: 0, y: -size },
        { x: size, y: 0 },
        { x: 0, y: size },
        { x: -size, y: 0 }
      ], color, 0.98);
      gem.setStrokeStyle(4, 0xf8fdff, 0.86);
      const label = this.add
        .text(x, y + size + 16, artifact.value.toString(), {
          color: "#050811",
          fontFamily: "Inter, Arial, sans-serif",
          fontSize: "13px",
          fontStyle: "900",
          backgroundColor: "#ffd56a",
          padding: { x: 6, y: 2 }
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: gem,
        scale: { from: 0.92, to: 1.12 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });

      return { ...artifact, x, y, gem, label };
    });
  }

  private createEscapeZone() {
    const atrium = this.rooms.get("atrium");
    if (!atrium) return;
    const ring = this.add.circle(0, 0, EXIT_RADIUS, 0x4cf4f0, 0.07).setStrokeStyle(4, 0x7effdf, 0.52);
    const label = this.add
      .text(0, EXIT_RADIUS + 24, "ESCAPE LIFT", {
        color: "#7effdf",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: "16px",
        fontStyle: "900",
        stroke: "#050811",
        strokeThickness: 5
      })
      .setOrigin(0.5);
    this.escapeZone = this.add.container(atrium.x, atrium.y + 92, [ring, label]);
  }

  private createActors(state: GameState) {
    const atrium = this.rooms.get("atrium")!;
    const human = state.players.find((player) => player.kind === "human") ?? state.players[0]!;
    this.player = this.createRuntimeAgent(human, atrium.x, atrium.y + 18, true);

    const aiStarts = ["east-hall", "west-hall", "guard-post", "vault-door", "moon-gallery"];
    for (const [index, ai] of state.players.filter((player) => player.kind === "ai").entries()) {
      const room = this.rooms.get(aiStarts[index % aiStarts.length]!) ?? atrium;
      const runtime = this.createRuntimeAgent(ai, room.x + (index % 2 === 0 ? 30 : -30), room.y, false);
      runtime.targetRoomId = this.pickAiTarget(runtime);
      this.aiAgents.push(runtime);
    }

    this.cameras.main.startFollow(this.player.body, true, 0.08, 0.08);
  }

  private createRuntimeAgent(player: PlayerState, x: number, y: number, controlled: boolean): RuntimeAgent {
    const color = controlled ? 0xffd56a : TEAM_COLORS[player.teamId];
    const shadow = this.add.circle(0, 12, 24, 0x000000, 0.22);
    const dot = this.add.circle(0, 0, controlled ? 20 : 17, color, 0.98).setStrokeStyle(4, 0xf8fdff, controlled ? 0.9 : 0.65);
    const visor = this.add.rectangle(6, -4, 16, 5, 0x050811, 0.58);
    const label = this.add
      .text(0, 32, controlled ? "YOU" : player.name.toUpperCase(), {
        color: controlled ? "#ffd56a" : "#f8fdff",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: controlled ? "15px" : "12px",
        fontStyle: "900",
        stroke: "#050811",
        strokeThickness: 5
      })
      .setOrigin(0.5);
    const body = this.add.container(x, y, [shadow, dot, visor, label]);
    body.setDepth(controlled ? 20 : 12);

    return {
      id: player.id,
      name: player.name,
      teamId: player.teamId,
      x,
      y,
      targetRoomId: "atrium",
      lootValue: 0,
      body,
      dot
    };
  }

  private updatePlayer(delta: number) {
    if (!this.player) return;
    const vector = new Phaser.Math.Vector2(0, 0);
    const cursors = this.cursors;
    const keys = this.keys;
    if (keys?.w.isDown || cursors?.up?.isDown) vector.y -= 1;
    if (keys?.s.isDown || cursors?.down?.isDown) vector.y += 1;
    if (keys?.a.isDown || cursors?.left?.isDown) vector.x -= 1;
    if (keys?.d.isDown || cursors?.right?.isDown) vector.x += 1;

    if (vector.lengthSq() > 0) {
      this.pointerTarget = undefined;
    } else if (this.pointerTarget) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.pointerTarget.x, this.pointerTarget.y);
      if (distance > 8) {
        vector.set(this.pointerTarget.x - this.player.x, this.pointerTarget.y - this.player.y);
      } else {
        this.pointerTarget = undefined;
      }
    }

    if (vector.lengthSq() > 0) {
      vector.normalize();
      let speed = PLAYER_SPEED;
      if (keys?.shift.isDown && this.dashCooldownMs <= 0) {
        speed = DASH_SPEED;
        this.dashCooldownMs = DASH_COOLDOWN_MS;
        this.addTrail(this.player.x, this.player.y);
      }
      this.moveAgent(this.player, vector.x * speed * (delta / 1000), vector.y * speed * (delta / 1000));
      this.player.body.rotation = Phaser.Math.Angle.Between(0, 0, vector.x, vector.y) + Math.PI / 2;
    }
  }

  private updateAi(delta: number) {
    for (const agent of this.aiAgents) {
      const target = this.rooms.get(agent.targetRoomId) ?? this.rooms.get("inner-vault");
      if (!target) continue;
      const vector = new Phaser.Math.Vector2(target.x - agent.x, target.y - agent.y);
      if (vector.length() < 36) {
        this.aiStealNearby(agent);
        agent.targetRoomId = this.pickAiTarget(agent);
        continue;
      }
      vector.normalize();
      this.moveAgent(agent, vector.x * AI_SPEED * (delta / 1000), vector.y * AI_SPEED * (delta / 1000));
      agent.body.rotation = Phaser.Math.Angle.Between(0, 0, vector.x, vector.y) + Math.PI / 2;
    }
  }

  private moveAgent(agent: RuntimeAgent, dx: number, dy: number) {
    agent.x = Phaser.Math.Clamp(agent.x + dx, 82, WORLD_WIDTH - 82);
    agent.y = Phaser.Math.Clamp(agent.y + dy, 82, WORLD_HEIGHT - 82);
    agent.body.setPosition(agent.x, agent.y);
  }

  private checkArtifactPickups() {
    if (!this.player) return;
    for (const artifact of this.artifacts) {
      if (artifact.takenBy) continue;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, artifact.x, artifact.y);
      if (distance > PICKUP_RADIUS) continue;
      artifact.takenBy = this.player.id;
      this.lootValue += artifact.value;
      this.artifactsStolen += 1;
      this.alarm = Math.min(5, this.alarm + (artifact.size === "major" ? 0.34 : 0.18));
      this.feedLine(`You stole ${artifact.name}.`);
      this.collectArtifactVisual(artifact, 0xffd56a);
    }
  }

  private aiStealNearby(agent: RuntimeAgent) {
    const artifact = this.artifacts.find(
      (candidate) =>
        !candidate.takenBy &&
        Phaser.Math.Distance.Between(agent.x, agent.y, candidate.x, candidate.y) < PICKUP_RADIUS + 18
    );
    if (!artifact) return;
    artifact.takenBy = agent.id;
    agent.lootValue += artifact.value;
    this.aiLootValue += artifact.value;
    this.alarm = Math.min(5, this.alarm + 0.12);
    this.feedLine(`${agent.name} lifted ${artifact.name}.`);
    this.collectArtifactVisual(artifact, TEAM_COLORS[agent.teamId]);
  }

  private collectArtifactVisual(artifact: RuntimeArtifact, color: number) {
    artifact.label.destroy();
    this.tweens.add({
      targets: artifact.gem,
      y: artifact.y - 42,
      scale: 1.8,
      alpha: 0,
      duration: 420,
      ease: "Cubic.easeOut",
      onComplete: () => artifact.gem.destroy()
    });
    this.add.circle(artifact.x, artifact.y, 40, color, 0.2).setDepth(18);
  }

  private updateAlarm(delta: number) {
    const pressure = delta / ARCADE_MISSION_DURATION_MS * 3.5;
    this.alarm = Math.min(5, this.alarm + pressure);
    if (this.alarm >= 4.65 && this.timeLeftMs() > 10_000) {
      this.feedLine("Lockdown sirens are spooling up.");
    }
  }

  private checkEscape() {
    const keys = this.keys;
    const interact = Boolean(
      keys && (Phaser.Input.Keyboard.JustDown(keys.e) || Phaser.Input.Keyboard.JustDown(keys.space))
    );
    if (!interact || !this.isNearExit()) return;
    if (this.lootValue > 0 || this.timeLeftMs() <= 30_000) {
      this.finish("escaped");
    } else {
      this.feedLine("The lift rejects an empty-handed alibi.");
    }
  }

  private pickAiTarget(agent: RuntimeAgent): string {
    const available = this.artifacts.filter((artifact) => !artifact.takenBy);
    if (available.length === 0) return "atrium";
    const nearest = available
      .map((artifact) => {
        const room = this.rooms.get(artifact.roomId)!;
        return {
          roomId: artifact.roomId,
          distance: Phaser.Math.Distance.Between(agent.x, agent.y, room.x, room.y)
        };
      })
      .sort((a, b) => a.distance - b.distance)[0];
    return nearest?.roomId ?? "inner-vault";
  }

  private isNearExit(): boolean {
    if (!this.player || !this.escapeZone) return false;
    return Phaser.Math.Distance.Between(this.player.x, this.player.y, this.escapeZone.x, this.escapeZone.y) <= EXIT_RADIUS;
  }

  private timeLeftMs(): number {
    return Math.max(0, ARCADE_MISSION_DURATION_MS - this.elapsedMs);
  }

  private phase(): ArcadeHudPhase {
    if (this.alarm >= 5 || this.timeLeftMs() <= 30_000) return "lockdown";
    if (this.alarm >= 3) return "alarm";
    return "stealth";
  }

  private emitHudIfNeeded(force: boolean) {
    if (!this.config || !this.state) return;
    if (!force && this.elapsedMs - this.lastHudAt < 180) return;
    this.lastHudAt = this.elapsedMs;
    const canEscape = this.lootValue > 0 || this.timeLeftMs() <= 30_000;
    const objective = canEscape
      ? this.isNearExit()
        ? "Press E / Space to vanish through the lift"
        : "Return to the Atrium lift and escape"
      : "Steal a relic before the vault learns your name";

    const hud: ArcadeHudState = {
      phase: this.phase(),
      timeLeftMs: this.timeLeftMs(),
      alarm: Math.ceil(this.alarm),
      lootValue: this.lootValue,
      aiLootValue: this.aiLootValue,
      artifactsStolen: this.artifactsStolen,
      totalArtifacts: this.artifacts.length,
      canEscape,
      dashReady: this.dashCooldownMs <= 0,
      objective,
      feed: this.feed.slice(-5)
    };
    this.config.onHudUpdate(hud);
  }

  private finish(outcome: "escaped" | "sealed" | "caught") {
    if (!this.config || this.finished) return;
    this.finished = true;
    this.emitHudIfNeeded(true);
    this.config.onFinish({
      outcome,
      playerName: this.playerName,
      lootValue: this.lootValue,
      artifactsStolen: this.artifactsStolen,
      aiLootValue: this.aiLootValue,
      alarm: Math.ceil(this.alarm),
      elapsedMs: this.elapsedMs
    });
  }

  private feedLine(text: string) {
    if (this.feed.at(-1) === text) return;
    this.feed.push(text);
    if (this.feed.length > 9) this.feed.shift();
    this.emitHudIfNeeded(true);
  }

  private addTrail(x: number, y: number) {
    const trail = this.add.circle(x, y, 28, 0xffd56a, 0.24).setDepth(8);
    this.tweens.add({
      targets: trail,
      scale: 2.8,
      alpha: 0,
      duration: 360,
      ease: "Cubic.easeOut",
      onComplete: () => trail.destroy()
    });
  }

  private resizeCamera = () => {
    const camera = this.cameras.main;
    const zoom = Phaser.Math.Clamp(Math.min(this.scale.width / 1120, this.scale.height / 720), 0.62, 1.08);
    camera.setZoom(zoom);
  };
}
