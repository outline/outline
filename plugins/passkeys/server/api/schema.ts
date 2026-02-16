import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";
import { UserPasskeyValidation } from "@shared/validations";

export const PasskeysListSchema = BaseSchema.extend({
  body: z.object({}),
});

export type PasskeysListReq = z.infer<typeof PasskeysListSchema>;

export const PasskeysDeleteSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid(),
  }),
});

export type PasskeysDeleteReq = z.infer<typeof PasskeysDeleteSchema>;

export const PasskeysUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.uuid(),
    name: z
      .string()
      .trim()
      .min(UserPasskeyValidation.minNameLength)
      .max(UserPasskeyValidation.maxNameLength),
  }),
});

export type PasskeysUpdateReq = z.infer<typeof PasskeysUpdateSchema>;
