import { z } from "zod";
import { CollectionPermission, IntegrationService } from "@shared/types";
import { BaseSchema } from "../schema";

export const ImportsCreateSchema = BaseSchema.extend({
  body: z.object({
    integrationId: z.string().uuid(),
    service: z.nativeEnum(IntegrationService),
    data: z.object({
      collection: z.array(
        z.object({
          externalId: z.string(),
          permission: z.nativeEnum(CollectionPermission).optional(),
        })
      ),
    }),
  }),
});

export type ImportsCreateReq = z.infer<typeof ImportsCreateSchema>;
