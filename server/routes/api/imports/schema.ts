import { z } from "zod";
import { NotionImportInputItemSchema } from "@shared/schema";
import { IntegrationService } from "@shared/types";
import { BaseSchema } from "../schema";

const BaseBodySchema = z.object({
  integrationId: z.string().uuid(),
});

export const ImportsCreateSchema = BaseSchema.extend({
  body: z.discriminatedUnion("service", [
    BaseBodySchema.extend({
      service: z.literal(IntegrationService.Notion),
      input: z.array(NotionImportInputItemSchema),
    }),
  ]),
});

export type ImportsCreateReq = z.infer<typeof ImportsCreateSchema>;
