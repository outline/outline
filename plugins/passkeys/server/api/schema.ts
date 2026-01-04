import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const PasskeysListSchema = BaseSchema.extend({
  body: z.object({}),
});

export type PasskeysListReq = z.infer<typeof PasskeysListSchema>;

export const PasskeysDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
  }),
});

export type PasskeysDeleteReq = z.infer<typeof PasskeysDeleteSchema>;

export const PasskeysRenameSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(255),
  }),
});

export type PasskeysRenameReq = z.infer<typeof PasskeysRenameSchema>;
