import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import BaseSchema from "../BaseSchema";

export const SearchesDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid().optional(),
    query: z.string().optional(),
  }),
}).refine((req) => !(isEmpty(req.body.id) && isEmpty(req.body.query)), {
  message: "id or query is required",
});

export type SearchesDeleteReq = z.infer<typeof SearchesDeleteSchema>;
