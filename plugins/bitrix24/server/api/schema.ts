import { z } from "zod";

export const Bitrix24CallbackSchema = z.object({
  query: z.object({
    code: z.string().optional(),
    state: z.string(),
    error: z.string().optional(),
  }),
});

export type Bitrix24CallbackReq = z.infer<typeof Bitrix24CallbackSchema>;
