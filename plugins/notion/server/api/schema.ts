import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const NotionCallbackSchema = BaseSchema.extend({
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

export type NotionCallbackReq = z.infer<typeof NotionCallbackSchema>;

export const NotionSearchSchema = BaseSchema.extend({
  body: z.object({
    integrationId: z.string().uuid(),
  }),
});

export type NotionSearchReq = z.infer<typeof NotionSearchSchema>;
