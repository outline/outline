import { z } from "zod";

export const TrelloCallbackSchema = z.object({
  query: z.object({
    oauth_token: z.string().optional(),
    oauth_verifier: z.string().optional(),
    state: z.string(),
    error: z.string().optional(),
  }),
});

export type TrelloCallbackReq = z.infer<typeof TrelloCallbackSchema>;
