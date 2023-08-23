import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { Revision } from "@server/models";
import BaseSchema from "@server/routes/api/BaseSchema";

export const RevisionsInfoSchema = BaseSchema.extend({
  body: z
    .object({
      id: z.string().uuid().optional(),
      documentId: z.string().uuid().optional(),
    })
    .refine((req) => !(isEmpty(req.id) && isEmpty(req.documentId)), {
      message: "id or documentId is required",
    }),
});

export type RevisionsInfoReq = z.infer<typeof RevisionsInfoSchema>;

export const RevisionsDiffSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
    compareToId: z.string().uuid().optional(),
  }),
});

export type RevisionsDiffReq = z.infer<typeof RevisionsDiffSchema>;

export const RevisionsListSchema = z.object({
  body: z.object({
    direction: z
      .string()
      .optional()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),

    sort: z
      .string()
      .refine((val) => Object.keys(Revision.getAttributes()).includes(val), {
        message: "Invalid sort parameter",
      })
      .default("createdAt"),

    documentId: z.string().uuid(),
  }),
});

export type RevisionsListReq = z.infer<typeof RevisionsListSchema>;
