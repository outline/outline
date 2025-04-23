import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const LinearCallbackSchema = BaseSchema.extend({
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

export type LinearCallbackReq = z.infer<typeof LinearCallbackSchema>;
