import { isEmpty } from "es-toolkit/compat";
import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const GiteaCallbackSchema = BaseSchema.extend({
  query: z
    .object({
      code: z.string().nullish(),
      state: z.string(),
      error: z.string().nullish(),
    })
    .refine((req) => !(isEmpty(req.code) && isEmpty(req.error)), {
      message: "one of code or error is required",
    }),
});

export type GiteaCallbackReq = z.infer<typeof GiteaCallbackSchema>;

export const GiteaConnectSchema = BaseSchema.extend({
  body: z.object({
    url: z.url().startsWith("https://"),
    clientId: z.string().trim().min(1),
    clientSecret: z.string().trim().min(1),
  }),
});

export type GiteaConnectReq = z.infer<typeof GiteaConnectSchema>;
