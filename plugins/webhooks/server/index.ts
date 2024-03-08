import { PluginManager, PluginType } from "@server/utils/PluginManager";
import config from "../plugin.json";
import webhookSubscriptions from "./api/webhookSubscriptions";
import WebhookProcessor from "./processors/WebhookProcessor";
import CleanupWebhookDeliveriesTask from "./tasks/CleanupWebhookDeliveriesTask";
import DeliverWebhookTask from "./tasks/DeliverWebhookTask";

PluginManager.register(PluginType.API, webhookSubscriptions, config)
  .registerProcessor(WebhookProcessor)
  .registerTask(DeliverWebhookTask)
  .registerTask(CleanupWebhookDeliveriesTask);
