import isEmpty from "lodash/isEmpty";
import { z } from "zod";
import { RevisionValidation } from "@shared/validations";
import { Revision } from "@server/models";
import { BaseSchema } from "@server/routes/api/schema";

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

export const RevisionsUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),

    name: z
      .string()
      .min(RevisionValidation.minNameLength)
      .max(RevisionValidation.maxNameLength)
      .or(z.null()),
  }),
});

export type RevisionsUpdateReq = z.infer<typeof RevisionsUpdateSchema>;

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

export const RevisionsDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
  }),
});

export type RevisionsDeleteReq = z.infer<typeof RevisionsDeleteSchema>;

export const RevisionsExportSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
  }),
});

export type RevisionsExportReq = z.infer<typeof RevisionsExportSchema>;
