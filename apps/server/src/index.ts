import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { Server } from "socket.io";
import { config } from "dotenv";
import type { ClientEvent, ServerEvent } from "@agent-alibi/shared";
import { clientEventSchema } from "@agent-alibi/shared";
import { RoomManager } from "./rooms/RoomManager";

config();

const port = Number(process.env.PORT ?? 8787);
const app = Fastify({ logger: true });
const roomManager = new RoomManager();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDist = path.resolve(__dirname, "../../web/dist");

app.get("/health", async () => ({ ok: true, service: "agent-alibi" }));

await app.register(fastifyStatic, {
  root: webDist,
  prefix: "/"
});

app.setNotFoundHandler((_request, reply) => {
  reply.sendFile("index.html");
});

const address = await app.listen({ port, host: "0.0.0.0" });
const io = new Server(app.server, {
  cors: {
    origin: true
  }
});

io.on("connection", (socket) => {
  socket.on("client:event", (payload: ClientEvent) => {
    try {
      const event = clientEventSchema.parse(payload);
      handleClientEvent(socket.id, event);
    } catch (error) {
      emitToSocket(socket.id, { type: "error", message: error instanceof Error ? error.message : "Invalid event." });
    }
  });

  function handleClientEvent(socketId: string, event: ClientEvent): void {
    if (event.type === "room:create") {
      const room = roomManager.createRoom(socketId, event.playerName);
      socket.join(room.code);
      emitRoom(room.code);
      return;
    }

    if (event.type === "room:join") {
      const room = roomManager.joinRoom(event.roomCode, socketId, event.playerName);
      socket.join(room.code);
      emitRoom(room.code);
      return;
    }

    const roomCode = Array.from(socket.rooms).find((code) => code !== socket.id);
    if (!roomCode) throw new Error("Join or create a room first.");

    if (event.type === "slot:add_ai") roomManager.addAi(roomCode, event.profileId);
    if (event.type === "slot:remove_ai") roomManager.removeAi(roomCode, event.slotId);
    if (event.type === "match:start") roomManager.startMatch(roomCode);
    if (event.type === "action:lock") {
      const room = roomManager.getRoom(roomCode);
      const playerId = room?.slots.find((slot) => slot.socketId === socketId)?.playerId;
      if (!playerId) throw new Error("Player not found in room.");
      roomManager.lockAction(roomCode, playerId, event.actionId);
    }
    emitRoom(roomCode);
  }

  function emitRoom(roomCode: string): void {
    const room = roomManager.getRoom(roomCode);
    if (!room) return;
    io.to(roomCode).emit("server:event", {
      type: "room:state",
      room: roomManager.toPublicState(room)
    } satisfies ServerEvent);
    if (!room.match) {
      return;
    }
    for (const socketId of io.sockets.adapter.rooms.get(roomCode) ?? []) {
      emitToSocket(socketId, {
        type: "match:state",
        state: room.match,
        legalActions: roomManager.getLegalActions(room, socketId)
      } satisfies ServerEvent);
      const summary = roomManager.getSummary(room);
      if (summary) {
        emitToSocket(socketId, { type: "match:finished", summary } satisfies ServerEvent);
      }
    }
  }
});

app.log.info(`Agent Alibi server listening at ${address}`);

function emitToSocket(socketId: string, event: ServerEvent): void {
  io.to(socketId).emit("server:event", event);
}
