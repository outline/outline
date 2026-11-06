import { z } from "zod";
import { IntegrationService } from "@shared/types";
import { AttachmentImportBodySchema } from "@server/routes/api/imports/schema";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import { SlabImportsProcessor } from "./processors/SlabImportsProcessor";
import SlabAPIImportTask from "./tasks/SlabAPIImportTask";

PluginManager.add([
  {
    type: Hook.ImportSchema,
    value: AttachmentImportBodySchema.extend({
      service: z.literal(IntegrationService.Slab),
    }),
  },
  {
    ...config,
    type: Hook.Processor,
    value: SlabImportsProcessor,
  },
  {
    ...config,
    type: Hook.Task,
    value: SlabAPIImportTask,
  },
]);
