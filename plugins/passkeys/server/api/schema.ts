import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";
import { PasskeyValidation } from "@shared/validations";

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

export const PasskeysUpdateSchema = BaseSchema.extend({
  body: z.object({
    id: z.string().uuid(),
    name: z
      .string()
      .trim()
      .min(PasskeyValidation.minNameLength)
      .max(PasskeyValidation.maxNameLength),
  }),
});

export type PasskeysUpdateReq = z.infer<typeof PasskeysUpdateSchema>;
