import { WebhookSubscription } from "@server/models";
import { Event } from "@server/types";
import DeliverWebhookTask from "../tasks/DeliverWebhookTask";
import BaseProcessor from "./BaseProcessor";

export default class WebhookProcessor extends BaseProcessor {
  static applicableEvents: ["*"] = ["*"];

  async perform(event: Event) {
    const webhookSubscriptions = await WebhookSubscription.findAll({
      where: {
        enabled: true,
        teamId: event.teamId,
      },
    });

    for (const subscription of webhookSubscriptions.filter((webhook) =>
      webhook.validForEvent(event)
    )) {
      DeliverWebhookTask.schedule({ event, subscription });
    }
  }
}
