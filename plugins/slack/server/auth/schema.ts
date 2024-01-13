import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const SlackCommandsSchema = BaseSchema.extend({
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

export type SlackCommandsReq = z.infer<typeof SlackCommandsSchema>;

export const SlackPostSchema = BaseSchema.extend({
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

export type SlackPostReq = z.infer<typeof SlackPostSchema>;
