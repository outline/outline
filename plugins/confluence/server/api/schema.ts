import { z } from "zod";

export const ConfluenceCallbackSchema = z.object({
  query: z.object({
    code: z.string().optional(),
    state: z.string(),
    error: z.string().optional(),
  }),
});

export type ConfluenceCallbackReq = z.infer<typeof ConfluenceCallbackSchema>;
