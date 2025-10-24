export type EmojisInfoReq = z.infer<typeof EmojisInfoSchema>;
import { z } from "zod";
import { EmojiValidation } from "@shared/validations";
import { BaseSchema } from "../schema";

export const EmojisInfoSchema = BaseSchema.extend({
  body: z
    .object({
      /** ID of the emoji to fetch */
      id: z.string().uuid().optional(),
      /** Name of the emoji to fetch */
      name: z.string().min(1).max(EmojiValidation.maxNameLength).optional(),
    })
    .refine((data) => data.id || data.name, {
      message: "Either id or name is required",
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
    url: z.string(),
  }),
});

export const EmojisDeleteSchema = BaseSchema.extend({
  body: z.object({
    /** ID of the emoji to delete */
    id: z.string().uuid(),
  }),
});

export type EmojisListReq = z.infer<typeof EmojisListSchema>;

export type EmojisCreateReq = z.infer<typeof EmojisCreateSchema>;

export type EmojisDeleteReq = z.infer<typeof EmojisDeleteSchema>;
