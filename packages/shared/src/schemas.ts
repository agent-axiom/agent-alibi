import { z } from "zod";

export const playerNameSchema = z.string().trim().min(1).max(24);
export const roomCodeSchema = z.string().trim().min(4).max(8).regex(/^[A-Z0-9]+$/);
export const chatTextSchema = z.string().trim().min(1).max(180);
export const actionIdSchema = z.string().trim().min(1).max(80);

export const clientEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("room:create"), playerName: playerNameSchema }),
  z.object({ type: z.literal("room:join"), roomCode: roomCodeSchema, playerName: playerNameSchema }),
  z.object({ type: z.literal("slot:add_ai"), profileId: z.string().min(1).max(32) }),
  z.object({ type: z.literal("slot:remove_ai"), slotId: z.string().min(1).max(48) }),
  z.object({ type: z.literal("match:start") }),
  z.object({ type: z.literal("chat:send"), text: chatTextSchema }),
  z.object({ type: z.literal("action:lock"), actionId: actionIdSchema }),
  z.object({ type: z.literal("action:unlock") })
]);

export type ParsedClientEvent = z.infer<typeof clientEventSchema>;
