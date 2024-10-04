import { z } from "zod";
import { Client } from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";

export const EmailSchema = BaseSchema.extend({
  body: z.object({
    email: z.string().email(),
    client: z.nativeEnum(Client).default(Client.Web),
  }),
});

export type EmailReq = z.infer<typeof EmailSchema>;

export const EmailCallbackSchema = BaseSchema.extend({
  query: z.object({
    token: z.string(),
    client: z.nativeEnum(Client).default(Client.Web),
    follow: z.string().default(""),
  }),
});

export type EmailCallbackReq = z.infer<typeof EmailCallbackSchema>;
