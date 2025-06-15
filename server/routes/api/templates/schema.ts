import { z } from "zod";
import { BaseSchema, ProsemirrorSchema } from "@server/routes/api/schema";
import { zodIconType, zodIdType } from "@server/utils/zod";
import { ValidateColor } from "@server/validation";

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

export const TemplatesDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: zodIdType(),
  }),
});

export type TemplatesDeleteReq = z.infer<typeof TemplatesDeleteSchema>;

export const TemplatesDuplicateSchema = BaseSchema.extend({
  body: z.object({
    id: zodIdType(),
    title: z.string().optional(),
  }),
});

export type TemplatesDuplicateReq = z.infer<typeof TemplatesDuplicateSchema>;

export const TemplatesUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: zodIdType(),
    title: z.string().optional(),
    data: ProsemirrorSchema().optional(),
    icon: zodIconType().nullish(),
    color: z
      .string()
      .regex(ValidateColor.regex, { message: ValidateColor.message })
      .nullish(),
    fullWidth: z.boolean().optional(),
    collectionId: z.string().nullish(),
  }),
});

export type TemplatesUpdateReq = z.infer<typeof TemplatesUpdateSchema>;
