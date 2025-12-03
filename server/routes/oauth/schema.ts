import z from "zod";
import { BaseSchema } from "../api/schema";

export const TokenSchema = BaseSchema.extend({
  body: z.object({
    grant_type: z.string(),
    code: z.string().optional(),
    redirect_uri: z.string().optional(),
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
    refresh_token: z.string().optional(),
    scope: z.string().optional(),
  }),
});

export type TokenReq = z.infer<typeof TokenSchema>;

export const TokenRevokeSchema = BaseSchema.extend({
  body: z.object({
    token: z.string(),
    token_type_hint: z.string().optional(),
  }),
});

export type TokenRevokeReq = z.infer<typeof TokenRevokeSchema>;
