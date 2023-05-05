import crypto from "crypto";
import { isEmpty } from "lodash";
import { z } from "zod";
import env from "@server/env";
import BaseSchema from "../BaseSchema";

export const CronSchema = BaseSchema.extend({
  body: z.object({
    token: z.string().optional(),
    limit: z.coerce.number().gt(0).default(500),
  }),
  query: z.object({
    token: z.string().optional(),
    limit: z.coerce.number().gt(0).default(500),
  }),
}).superRefine((req, ctx) => {
  if (isEmpty(req.body.token) && isEmpty(req.query.token)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "token is required",
      fatal: true,
    });

    return z.NEVER;
  }

  const token = (req.body.token ?? req.query.token) as string;
  if (
    token.length !== env.UTILS_SECRET.length ||
    !crypto.timingSafeEqual(
      Buffer.from(env.UTILS_SECRET),
      Buffer.from(String(token))
    )
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "invalid token",
    });
  }

  return;
});

export type CronSchemaReq = z.infer<typeof CronSchema>;
