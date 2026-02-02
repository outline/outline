import { z } from "zod";

export const GitLabCallbackSchema = z.object({
  query: z.object({
    code: z.string().optional(),
    state: z.string(),
    error: z.string().optional(),
  }),
});

export type GitLabCallbackReq = z.infer<typeof GitLabCallbackSchema>;
