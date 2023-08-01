import { z } from "zod";
import { IntegrationType } from "@shared/types";
import { Integration } from "@server/models";
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
