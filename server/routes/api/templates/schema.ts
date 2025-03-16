import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";
import { zodIdType } from "@server/utils/zod";

const TemplatesSortParamsSchema = z.object({
  /** Specifies the attributes by which templates will be sorted in the list */
  sort: z
    .string()
    .refine((val) =>
      ["createdAt", "updatedAt", "publishedAt", "title"].includes(val)
    )
    .default("updatedAt"),

  /** Specifies the sort order with respect to sort field */
  direction: z
    .string()
    .optional()
    .transform((val) => (val !== "ASC" ? "DESC" : val)),
});

export const TemplatesListSchema = BaseSchema.extend({
  body: TemplatesSortParamsSchema.extend({
    /** Id of the collection to which the template belongs */
    collectionId: z.string().uuid().optional(),
  }),
});

export type TemplatesListReq = z.infer<typeof TemplatesListSchema>;

export const TemplatesInfoSchema = BaseSchema.extend({
  body: z.object({
    id: zodIdType(),
  }),
});

export type TemplatesInfoReq = z.infer<typeof TemplatesInfoSchema>;
