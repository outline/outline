import { BaseSchema } from "@server/routes/api/schema";
import isEmpty from "lodash/isEmpty";
import { z } from "zod";

export const FigmaCallbackSchema = BaseSchema.extend({
  query: z
    .object({
      code: z.string().nullish(),
      state: z.string(),
      error: z.string().nullish(),
    })
    .refine((req) => !(isEmpty(req.code) && isEmpty(req.error)), {
      error: "one of code or error is required",
    })
    .refine((req) => isEmpty(req.code) || isEmpty(req.error), {
      error: "code and error cannot both be present",
    }),
});

export type FigmaCallbackReq = z.infer<typeof FigmaCallbackSchema>;
