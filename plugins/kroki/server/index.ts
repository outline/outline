import { z } from "zod";
import { IntegrationService } from "@shared/types";
import { Hook, PluginManager } from "@server/utils/PluginManager";

PluginManager.add({
  type: Hook.IntegrationSettings,
  value: {
    service: IntegrationService.Kroki,
    keys: ["kroki"],
    visibleToGuests: true,
    schema: z.object({
      kroki: z.object({
        url: z.url(),
        enabledFormats: z.array(z.string()).optional(),
      }),
    }),
  },
});
