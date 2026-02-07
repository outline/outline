import { z } from "zod";
import { Client } from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";

export const LocalAuthSigninSchema = BaseSchema.extend({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    client: z.nativeEnum(Client).default(Client.Web),
  }),
});

export type LocalAuthSigninReq = z.infer<typeof LocalAuthSigninSchema>;

export const LocalAuthSignupSchema = BaseSchema.extend({
  body: z.object({
    email: z.string().email(),
    username: z.string().min(1).max(255),
    password: z.string().min(8).max(255),
    client: z.nativeEnum(Client).default(Client.Web),
  }),
});

export type LocalAuthSignupReq = z.infer<typeof LocalAuthSignupSchema>;
