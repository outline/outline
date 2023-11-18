import { z } from "zod";
import BaseSchema from "@server/routes/api/BaseSchema";

const CollectionsSortParamsSchema = z.object({
  /** Specifies the attributes by which documents will be sorted in the list */
  sort: z
    .string()
    .refine((val) => ["createdAt", "updatedAt"].includes(val))
    .default("createdAt"),

  /** Specifies the sort order with respect to sort field */
  direction: z
    .string()
    .optional()
    .transform((val) => (val !== "ASC" ? "DESC" : val)),
});

export const CommentsCreateSchema = BaseSchema.extend({
  body: z.object({
    /** Allow creation with a specific ID */
    id: z.string().uuid().optional(),

    /** Create comment for this document */
    documentId: z.string(),

    /** Create comment under this parent */
    parentCommentId: z.string().uuid().optional(),

    /** Create comment with this data */
    data: z.any(),
  }),
});

export type CommentsCreateReq = z.infer<typeof CommentsCreateSchema>;

export const CommentsUpdateSchema = BaseSchema.extend({
  body: z.object({
    /** Which comment to update */
    id: z.string().uuid(),

    /** Update comment with this data */
    data: z.any(),
  }),
});

export type CommentsUpdateReq = z.infer<typeof CommentsUpdateSchema>;

export const CommentsDeleteSchema = BaseSchema.extend({
  body: z.object({
    /** Which comment to delete */
    id: z.string().uuid(),
  }),
});

export type CommentsDeleteReq = z.infer<typeof CommentsDeleteSchema>;

export const CollectionsListSchema = BaseSchema.extend({
  body: CollectionsSortParamsSchema.extend({
    /** Id of a document to list comments for */
    documentId: z.string().optional(),
    collectionId: z.string().uuid().optional(),
  }),
});

export type CollectionsListReq = z.infer<typeof CollectionsListSchema>;
