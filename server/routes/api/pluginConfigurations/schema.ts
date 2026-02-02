import { z } from "zod";
import { BaseSchema } from "@server/routes/api/schema";

export const PluginConfigurationsUpdateSchema = BaseSchema.extend({
  body: z.object({
    /** Plugin ID (e.g., "confluence") */
    pluginId: z.string().min(1).max(255),
    /** Configuration object with key-value pairs */
    config: z.record(z.string(), z.string().optional()),
  }),
});

export type PluginConfigurationsUpdateReq = z.infer<
  typeof PluginConfigurationsUpdateSchema
>;

export const PluginConfigurationsInfoSchema = BaseSchema.extend({
  body: z.object({
    /** Plugin ID (e.g., "confluence") */
    pluginId: z.string().min(1).max(255),
  }),
});

export type PluginConfigurationsInfoReq = z.infer<
  typeof PluginConfigurationsInfoSchema
>;
