import { isEmpty } from "lodash";
import { z } from "zod";
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
}).refine((req) => !(isEmpty(req.body.token) && isEmpty(req.query.token)), {
  message: "token is required",
});

export type CronSchemaReq = z.infer<typeof CronSchema>;
