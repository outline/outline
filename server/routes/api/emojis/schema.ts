import { z } from "zod";
import { BaseSchema } from "../schema";

export const EmojisListSchema = BaseSchema.extend({
  body: z.object({
    /** Optional team ID to filter emojis. Defaults to user's team. */
    teamId: z.string().uuid().optional(),
  }),
});

export const EmojisCreateSchema = BaseSchema.extend({
  body: z.object({
    /** Name/shortcode for the emoji (e.g., "awesome") */
    name: z.string().min(1).max(50),
    /** URL to the emoji image */
    url: z.string().url().max(500),
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
