import { z } from "zod";
import { IntegrationService } from "@shared/types";
import { Hook, PluginManager } from "@server/utils/PluginManager";

PluginManager.add({
  type: Hook.IntegrationSettings,
  value: {
    service: IntegrationService.Diagrams,
    keys: ["diagrams"],
    schema: z.object({
      diagrams: z.object({ url: z.url() }),
    }),
  },
});
