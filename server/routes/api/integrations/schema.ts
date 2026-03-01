import { z } from "zod";
import {
  IntegrationService,
  IntegrationType,
  UserCreatableIntegrationService,
} from "@shared/types";
import { Integration } from "@server/models";
import { BaseSchema } from "../schema";

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
        error: "Invalid sort parameter",
      })
      .prefault("updatedAt"),

    /** Integration type */
    type: z.enum(IntegrationType).optional(),

    /** Integration service */
    service: z.enum(IntegrationService).optional(),
  }),
});

export type IntegrationsListReq = z.infer<typeof IntegrationsListSchema>;

export const IntegrationsCreateSchema = BaseSchema.extend({
  body: z.object({
    /** Integration type */
    type: z.enum(IntegrationType),

    /** Integration service */
    service: z.enum(UserCreatableIntegrationService),

    /** Integration config/settings */
    settings: z
      .object({ url: z.url() })
      .or(
        z.object({
          url: z.url(),
          channel: z.string(),
          channelId: z.string(),
        })
      )
      .or(
        z.object({
          measurementId: z.string(),
          instanceUrl: z.url().optional(),
          scriptName: z.string().optional(),
        })
      )
      .or(
        z.object({
          diagrams: z.object({ url: z.url() }),
        })
      )
      .or(
        z.object({
          gitlab: z.object({
            url: z.url().optional(),
            installation: z
              .object({
                id: z.number(),
                account: z.object({
                  id: z.number(),
                  name: z.string(),
                  avatarUrl: z.string(),
                }),
              })
              .optional(),
          }),
        })
      )
      .or(z.object({ serviceTeamId: z.string() }))
      .optional(),
  }),
});

export type IntegrationsCreateReq = z.infer<typeof IntegrationsCreateSchema>;

export const IntegrationsUpdateSchema = BaseSchema.extend({
  body: z.object({
    /** Id of integration that needs update */
    id: z.uuid(),

    /** Integration config/settings */
    settings: z
      .object({ url: z.url() })
      .or(
        z.object({
          url: z.url(),
          channel: z.string(),
          channelId: z.string(),
        })
      )
      .or(
        z.object({
          measurementId: z.string(),
          instanceUrl: z.url().optional(),
          scriptName: z.string().optional(),
        })
      )
      .or(
        z.object({
          diagrams: z.object({ url: z.url() }),
        })
      )
      .or(
        z.object({
          gitlab: z.object({
            url: z.url().optional(),
            installation: z
              .object({
                id: z.number(),
                account: z.object({
                  id: z.number(),
                  name: z.string(),
                  avatarUrl: z.string(),
                }),
              })
              .optional(),
          }),
        })
      )
      .or(z.object({ serviceTeamId: z.string() }))
      .optional(),

    /** Integration events */
    events: z.array(z.string()).optional().prefault([]),
  }),
});

export type IntegrationsUpdateReq = z.infer<typeof IntegrationsUpdateSchema>;

export const IntegrationsInfoSchema = BaseSchema.extend({
  body: z.object({
    /** Id of integration to find */
    id: z.uuid(),
  }),
});

export type IntegrationsInfoReq = z.infer<typeof IntegrationsInfoSchema>;

export const IntegrationsDeleteSchema = BaseSchema.extend({
  body: z.object({
    /** Id of integration to be deleted */
    id: z.uuid(),
  }),
});

export type IntegrationsDeleteReq = z.infer<typeof IntegrationsDeleteSchema>;
