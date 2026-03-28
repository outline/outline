import { z } from "zod";
import { BaseSchema } from "../schema";

export const TagsCreateSchema = BaseSchema.extend({
  body: z.object({
    name: z
      .string()
      .min(1)
      .max(100)
      .refine((v) => /^[\w-]+$/.test(v.trim()), {
        message: "Tag name may only contain letters, numbers, hyphens, and underscores",
      }),
  }),
});
export type TagsCreateReq = z.infer<typeof TagsCreateSchema>;

export const TagsUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid(),
    name: z
      .string()
      .min(1)
      .max(100)
      .refine((v) => /^[\w-]+$/.test(v.trim()), {
        message: "Tag name may only contain letters, numbers, hyphens, and underscores",
      }),
  }),
});
export type TagsUpdateReq = z.infer<typeof TagsUpdateSchema>;

export const TagsDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid(),
  }),
});
export type TagsDeleteReq = z.infer<typeof TagsDeleteSchema>;

export const TagsListSchema = BaseSchema;
export type TagsListReq = z.infer<typeof TagsListSchema>;

export const TagsAddSchema = BaseSchema.extend({
  body: z.object({
    tagId: z.uuid(),
    documentId: z.uuid(),
  }),
});
export type TagsAddReq = z.infer<typeof TagsAddSchema>;

export const TagsRemoveSchema = BaseSchema.extend({
  body: z.object({
    tagId: z.uuid(),
    documentId: z.uuid(),
  }),
});
export type TagsRemoveReq = z.infer<typeof TagsRemoveSchema>;
