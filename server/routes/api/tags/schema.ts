import { z } from "zod";
import { TagValidation } from "@shared/validations";
import { normalizeTagName } from "@shared/utils/TagHelper";
import { ValidateColor } from "@server/validation";
import { BaseSchema } from "../schema";

const TagNameSchema = z
  .string()
  .transform((val) => normalizeTagName(val))
  .pipe(
    z
      .string()
      .min(1)
      .max(TagValidation.maxNameLength)
      .regex(TagValidation.nameRegex, {
        message:
          "Tag name must include a letter or number and may only contain letters, numbers, hyphens, and underscores",
      })
  );

const TagColorSchema = z
  .string()
  .regex(ValidateColor.regex, { message: ValidateColor.message })
  .nullable();

export const TagsCreateSchema = BaseSchema.extend({
  body: z.object({
    /** The name of the tag. Normalized to NFC and lowercased before storage. */
    name: TagNameSchema,

    /** The color to assign the tag, as a hex string. Defaults to no color. */
    color: TagColorSchema.optional(),
  }),
});
export type TagsCreateReq = z.infer<typeof TagsCreateSchema>;

export const TagsUpdateSchema = BaseSchema.extend({
  body: z
    .object({
      /** Id of the tag to update. */
      id: z.uuid(),

      /** The new name for the tag. At least one of `name` or `color` is required. */
      name: TagNameSchema.optional(),

      /** The new color for the tag, as a hex string, or `null` to clear it. */
      color: TagColorSchema.optional(),
    })
    .refine((val) => val.name !== undefined || val.color !== undefined, {
      message: "At least one of 'name' or 'color' must be provided",
      path: ["body"],
    }),
});
export type TagsUpdateReq = z.infer<typeof TagsUpdateSchema>;

export const TagsDeleteSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the tag to delete. */
    id: z.uuid(),
  }),
});
export type TagsDeleteReq = z.infer<typeof TagsDeleteSchema>;

export const TagsListSchema = BaseSchema.extend({
  body: z
    .object({
      /** The field to sort tags by */
      sort: z.enum(["name", "documentCount"]).prefault("name"),

      /** The sort direction, defaults to ascending by name and descending by count */
      direction: z.enum(["ASC", "DESC"]).optional(),
    })
    .prefault({}),
});
export type TagsListReq = z.infer<typeof TagsListSchema>;

export const TagsAddSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the tag to apply. */
    tagId: z.uuid(),

    /** Id of the document to apply the tag to. */
    documentId: z.uuid(),
  }),
});
export type TagsAddReq = z.infer<typeof TagsAddSchema>;

export const TagsRemoveSchema = BaseSchema.extend({
  body: z.object({
    /** Id of the tag to remove. */
    tagId: z.uuid(),

    /** Id of the document to remove the tag from. */
    documentId: z.uuid(),
  }),
});
export type TagsRemoveReq = z.infer<typeof TagsRemoveSchema>;

export const TagsMergeSchema = BaseSchema.extend({
  body: z
    .object({
      /** Id of the tag to merge from. Deleted once its documents are moved to `targetId`. */
      sourceId: z.uuid(),

      /** Id of the tag to merge into. Survives the merge with `sourceId`'s documents attached. */
      targetId: z.uuid(),
    })
    .refine((val) => val.sourceId !== val.targetId, {
      message: "'sourceId' and 'targetId' must be different",
      path: ["body"],
    }),
});
export type TagsMergeReq = z.infer<typeof TagsMergeSchema>;
