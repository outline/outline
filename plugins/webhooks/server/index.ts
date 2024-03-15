import { PluginManager, PluginType } from "@server/utils/PluginManager";
import config from "../plugin.json";
import webhookSubscriptions from "./api/webhookSubscriptions";
import WebhookProcessor from "./processors/WebhookProcessor";
import CleanupWebhookDeliveriesTask from "./tasks/CleanupWebhookDeliveriesTask";
import DeliverWebhookTask from "./tasks/DeliverWebhookTask";

PluginManager.add([
  {
    ...config,
    type: PluginType.API,
    value: webhookSubscriptions,
  },
  {
    type: PluginType.Processor,
    value: WebhookProcessor,
  },
  {
    type: PluginType.Task,
    value: DeliverWebhookTask,
  },
  {
    type: PluginType.Task,
    value: CleanupWebhookDeliveriesTask,
  },
]);
