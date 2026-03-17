import { z } from "zod";
import { BaseSchema } from "../schema";

export const TagsCreateSchema = BaseSchema.extend({
  body: z.object({
    name: z.string().min(1).max(100),
  }),
});
export type TagsCreateReq = z.infer<typeof TagsCreateSchema>;

export const TagsUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
  }),
});
export type TagsUpdateReq = z.infer<typeof TagsUpdateSchema>;

export const TagsDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
  }),
});
export type TagsDeleteReq = z.infer<typeof TagsDeleteSchema>;

export const TagsListSchema = BaseSchema;
export type TagsListReq = z.infer<typeof TagsListSchema>;

export const TagsAddSchema = BaseSchema.extend({
  body: z.object({
    tagId: z.string().uuid(),
    documentId: z.string().uuid(),
  }),
});
export type TagsAddReq = z.infer<typeof TagsAddSchema>;

export const TagsRemoveSchema = BaseSchema.extend({
  body: z.object({
    tagId: z.string().uuid(),
    documentId: z.string().uuid(),
  }),
});
export type TagsRemoveReq = z.infer<typeof TagsRemoveSchema>;
