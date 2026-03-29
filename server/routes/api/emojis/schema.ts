import { z } from "zod";
import { EmojiValidation } from "@shared/validations";
import { BaseSchema } from "../schema";
import { zodShareIdType } from "@server/utils/zod";

export const EmojisInfoSchema = BaseSchema.extend({
  body: z
    .object({
      /** ID of the emoji to fetch */
      id: z.uuid().optional(),
      /** Name of the emoji to fetch */
      name: z.string().min(1).max(EmojiValidation.maxNameLength).optional(),
    })
    .refine((data) => data.id || data.name, {
      error: "Either id or name is required",
    }),
});

export const EmojisListSchema = BaseSchema.extend({
  body: z.object({
    query: z.string().optional(),
  }),
});

export const EmojisCreateSchema = BaseSchema.extend({
  body: z.object({
    /** Name/shortcode for the emoji (e.g., "awesome") */
    name: z.string().min(1).max(EmojiValidation.maxNameLength),
    /** URL to the emoji image */
    attachmentId: z.uuid(),
  }),
});

export const EmojisDeleteSchema = BaseSchema.extend({
  body: z.object({
    /** ID of the emoji to delete */
    id: z.uuid(),
  }),
});

export const EmojisRedirectSchema = BaseSchema.extend({
  query: z.object({
    /** Id of the emoji */
    id: z.uuid(),
    /** Share Id, if available */
    shareId: zodShareIdType().optional(),
  }),
});

export type EmojisRedirectReq = z.infer<typeof EmojisRedirectSchema>;

export type EmojisInfoReq = z.infer<typeof EmojisInfoSchema>;

export type EmojisListReq = z.infer<typeof EmojisListSchema>;

export type EmojisCreateReq = z.infer<typeof EmojisCreateSchema>;

export type EmojisDeleteReq = z.infer<typeof EmojisDeleteSchema>;
