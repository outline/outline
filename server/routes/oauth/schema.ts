import z from "zod";
import { BaseSchema } from "../api/schema";

export const TokenRevokeSchema = BaseSchema.extend({
  body: z.object({
    token: z.string(),
    token_type_hint: z.string().optional(),
  }),
});

export type TokenRevokeReq = z.infer<typeof TokenRevokeSchema>;
