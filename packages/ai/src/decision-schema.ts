import { z } from "zod";

export const aiDecisionSchema = z.object({
  publicMessage: z.string().trim().min(1).max(180),
  chosenActionId: z.string().trim().min(1).max(120),
  intentSummary: z.string().trim().min(1).max(240),
  confidence: z.enum(["low", "medium", "high"])
});

export type AIDecision = z.infer<typeof aiDecisionSchema>;
