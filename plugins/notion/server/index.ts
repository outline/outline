import { z } from "zod";
import { IntegrationService } from "@shared/types";
import { IntegrationImportBodySchema } from "@server/routes/api/imports/schema";
import { Hook, PluginManager } from "@server/utils/PluginManager";
import config from "../plugin.json";
import router from "./api/notion";
import { NotionImportInputItemSchema } from "../shared/schema";
import env from "./env";
import { NotionImportsProcessor } from "./processors/NotionImportsProcessor";
import NotionAPIImportTask from "./tasks/NotionAPIImportTask";

PluginManager.add({
  type: Hook.ImportSchema,
  value: IntegrationImportBodySchema.extend({
    service: z.literal(IntegrationService.Notion),
    input: z.array(NotionImportInputItemSchema),
  }),
});

const enabled = !!env.NOTION_CLIENT_ID && !!env.NOTION_CLIENT_SECRET;

if (enabled) {
  PluginManager.add([
    {
      ...config,
      type: Hook.API,
      value: router,
    },
    {
      type: Hook.Processor,
      value: NotionImportsProcessor,
    },
    {
      type: Hook.Task,
      value: NotionAPIImportTask,
    },
  ]);
}
