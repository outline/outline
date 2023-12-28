import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { BaseSchema } from "../schema";

export const SearchesDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid().optional(),
    query: z.string().optional(),
  }),
}).refine((req) => !(isEmpty(req.body.id) && isEmpty(req.body.query)), {
  message: "id or query is required",
});

export type SearchesDeleteReq = z.infer<typeof SearchesDeleteSchema>;

export const SearchesUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
    score: z.number().min(-1).max(1),
  }),
});

export type SearchesUpdateReq = z.infer<typeof SearchesUpdateSchema>;

export const SearchesListSchema = BaseSchema.extend({
  body: z
    .object({
      source: z.string().optional(),
    })
    .optional(),
});

export type SearchesListReq = z.infer<typeof SearchesListSchema>;
