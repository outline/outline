import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const GitLabCallbackSchema = BaseSchema.extend({
  query: z
    .object({
      code: z.string().nullish(),
      state: z.string().uuid().nullish(),
      error: z.string().nullish(),
    })
    .refine((req) => !(isEmpty(req.code) && isEmpty(req.error)), {
      message: "one of code or error is required",
    }),
});

export type GitLabCallbackReq = z.infer<typeof GitLabCallbackSchema>;

export const GitLabConnectSchema = BaseSchema.extend({
  body: z
    .object({
      url: z.url().startsWith("https://").optional(),
      clientId: z.string().optional(),
      clientSecret: z.string().optional(),
    })
    .refine(
      (data) => {
        const { url, clientId, clientSecret } = data;
        const allOrNone =
          (url && clientId && clientSecret) ||
          (!url && !clientId && !clientSecret);
        return allOrNone;
      },
      {
        message:
          "Either all of url, clientId, and clientSecret must be provided, or none of them.",
      }
    ),
});

export type GitLabConnectReq = z.infer<typeof GitLabConnectSchema>;
