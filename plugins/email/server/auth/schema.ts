import { z } from "zod";
import { Client } from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";

export const EmailSchema = BaseSchema.extend({
  body: z.object({
    email: z.string().email(),
    client: z.nativeEnum(Client).default(Client.Web),
    preferOTP: z.boolean().default(false),
  }),
});

export type EmailReq = z.infer<typeof EmailSchema>;

const callbackDataSchema = z
  .object({
    token: z.string().optional(),
    code: z.string().optional(),
    email: z.string().email().optional(),
    client: z.nativeEnum(Client).optional(),
    follow: z.string().default(""),
  })
  .refine(
    (data: { code?: string; email?: string; token?: string }) =>
      !(data.code && !data.email) && !(data.email && !data.code && !data.token),
    {
      message: "Both code and email must be provided together",
    }
  );

export const EmailCallbackSchema = BaseSchema.extend({
  query: callbackDataSchema,
  body: callbackDataSchema,
});

export type EmailCallbackReq = z.infer<typeof EmailCallbackSchema>;
