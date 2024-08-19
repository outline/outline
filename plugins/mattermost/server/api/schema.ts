import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const MattermostConnectSchema = BaseSchema.extend({
  body: z.object({
    url: z.string(),
    apiKey: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
    team: z.object({
      id: z.string(),
      name: z.string(),
    }),
  }),
});

export type MattermostConnectReq = z.infer<typeof MattermostConnectSchema>;
