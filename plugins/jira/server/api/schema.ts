import { z } from "zod";

export const JiraCallbackSchema = z.object({
  query: z.object({
    oauth_token: z.string().optional(),
    oauth_verifier: z.string().optional(),
    state: z.string(),
    error: z.string().optional(),
  }),
});

export type JiraCallbackReq = z.infer<typeof JiraCallbackSchema>;
