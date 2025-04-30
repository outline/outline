import { WebhookSubscription } from "@server/models";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import { Event } from "@server/types";
import DeliverWebhookTask from "../tasks/DeliverWebhookTask";

export default class WebhookProcessor extends BaseProcessor {
  static applicableEvents: ["*"] = ["*"];

  async perform(event: Event) {
    if (!event.teamId) {
      return;
    }

    const webhookSubscriptions = await WebhookSubscription.findAll({
      where: {
        enabled: true,
        teamId: event.teamId,
      },
    });

    const applicableSubscriptions = webhookSubscriptions.filter((webhook) =>
      webhook.validForEvent(event)
    );

    await Promise.all(
      applicableSubscriptions.map((subscription) =>
        new DeliverWebhookTask().schedule({
          event,
          subscriptionId: subscription.id,
        })
      )
    );
  }
}
