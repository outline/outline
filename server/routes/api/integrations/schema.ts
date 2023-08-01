import { z } from "zod";
import { IntegrationType } from "@shared/types";
import { Integration } from "@server/models";
import { UserCreatableIntegrationService } from "@server/models/Integration";
import BaseSchema from "../BaseSchema";

export const IntegrationsListSchema = BaseSchema.extend({
  body: z.object({
    /** Integrations sorting direction */
    direction: z
      .string()
      .optional()
      .transform((val) => (val !== "ASC" ? "DESC" : val)),

    /** Integrations sorting column */
    sort: z
      .string()
      .refine((val) => Object.keys(Integration.getAttributes()).includes(val), {
        message: "Invalid sort parameter",
      })
      .default("updatedAt"),

    /** Integration type */
    type: z.nativeEnum(IntegrationType),
  }),
});

export type IntegrationsListReq = z.infer<typeof IntegrationsListSchema>;

export const IntegrationsCreateSchema = BaseSchema.extend({
  body: z.object({
    /** Integration type */
    type: z.nativeEnum(IntegrationType),

    /** Integration service */
    service: z.nativeEnum(UserCreatableIntegrationService),

    /** Integration config/settings */
    settings: z
      .object({ url: z.string().url() })
      .or(
        z.object({
          url: z.string().url(),
          channel: z.string(),
          channelId: z.string(),
        })
      )
      .or(z.object({ measurementId: z.string() }))
      .or(z.object({ serviceTeamId: z.string() }))
      .optional(),
  }),
});

export type IntegrationsCreateReq = z.infer<typeof IntegrationsCreateSchema>;
