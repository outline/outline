import { z } from "zod";
import { Client } from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";
import { isPasswordStrong } from "@server/utils/password";

export const PasswordSchema = BaseSchema.extend({
  body: z.object({
    email: z.string().email(),
    password: z
      .string()
      .min(8)
      .max(128)
      .refine(isPasswordStrong, {
        message: "Password must include letters and numbers",
      }),
    client: z.nativeEnum(Client).default(Client.Web),
  }),
});

export type PasswordReq = z.infer<typeof PasswordSchema>;

export const PasswordResetRequestSchema = BaseSchema.extend({
  body: z.object({
    email: z.string().email(),
  }),
});

export type PasswordResetRequestReq = z.infer<typeof PasswordResetRequestSchema>;

export const PasswordResetConfirmSchema = BaseSchema.extend({
  body: z.object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8)
      .max(128)
      .refine(isPasswordStrong, {
        message: "Password must include letters and numbers",
      }),
    client: z.nativeEnum(Client).default(Client.Web),
  }),
});

export type PasswordResetConfirmReq = z.infer<typeof PasswordResetConfirmSchema>;
