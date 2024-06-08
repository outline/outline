import { PluginManager, Hook } from "@server/utils/PluginManager";
import config from "../plugin.json";
import webhookSubscriptions from "./api/webhookSubscriptions";
import WebhookProcessor from "./processors/WebhookProcessor";
import CleanupWebhookDeliveriesTask from "./tasks/CleanupWebhookDeliveriesTask";
import DeliverWebhookTask from "./tasks/DeliverWebhookTask";

PluginManager.add([
  {
    ...config,
    type: Hook.API,
    value: webhookSubscriptions,
  },
  {
    type: Hook.Processor,
    value: WebhookProcessor,
  },
  {
    type: Hook.Task,
    value: DeliverWebhookTask,
  },
  {
    type: Hook.Task,
    value: CleanupWebhookDeliveriesTask,
  },
]);
