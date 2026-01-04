import { z } from "zod";
import { Client } from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";

export const PasskeysGenerateAuthenticationOptionsSchema = BaseSchema.extend({
  body: z.object({}),
  query: z.object({
    client: z.nativeEnum(Client).optional(),
  }),
});

export type PasskeysGenerateAuthenticationOptionsReq = z.infer<
  typeof PasskeysGenerateAuthenticationOptionsSchema
>;

export const PasskeysVerifyAuthenticationSchema = BaseSchema.extend({
  body: z.any(), // WebAuthn AuthenticationResponseJSON from @simplewebauthn/browser
  query: z.object({
    client: z.nativeEnum(Client).optional(),
  }),
});

export type PasskeysVerifyAuthenticationReq = z.infer<
  typeof PasskeysVerifyAuthenticationSchema
>;

export const PasskeysVerifyRegistrationSchema = BaseSchema.extend({
  body: z.any(), // WebAuthn RegistrationResponseJSON from @simplewebauthn/browser
});

export type PasskeysVerifyRegistrationReq = z.infer<
  typeof PasskeysVerifyRegistrationSchema
>;
