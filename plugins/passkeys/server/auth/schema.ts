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
  body: z.object({
    challengeId: z.string(),
    client: z.nativeEnum(Client).optional(),
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      authenticatorData: z.string(),
      clientDataJSON: z.string(),
      signature: z.string(),
      userHandle: z.string().optional(),
    }),
    type: z.literal("public-key"),
    authenticatorAttachment: z.enum(["cross-platform", "platform"]).optional(),
    clientExtensionResults: z
      .object({
        appid: z.boolean().optional(),
        hmacCreateSecret: z.boolean().optional(),
      })
      .default({}),
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
