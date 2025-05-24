import { z } from "zod";
import { EmojiValidation } from "@shared/validations";
import { BaseSchema } from "../schema";

export const EmojisListSchema = BaseSchema.extend({
  body: z.object({}),
});

export const EmojisCreateSchema = BaseSchema.extend({
  body: z.object({
    /** Name/shortcode for the emoji (e.g., "awesome") */
    name: z.string().min(1).max(EmojiValidation.maxNameLength),
    /** URL to the emoji image */
    url: z.string().url().max(EmojiValidation.maxUrlLength),
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
