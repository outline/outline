import { WebhookSubscription } from "@server/models";
import BaseProcessor from "@server/queues/processors/BaseProcessor";
import type { Event } from "@server/types";
import DeliverWebhookTask from "../tasks/DeliverWebhookTask";

export default class WebhookProcessor extends BaseProcessor {
  static applicableEvents: ["*"] = ["*"];

  /**
   * Only queue an event when the team has an enabled webhook subscription that
   * matches it. The vast majority of events belong to teams with no applicable
   * subscriptions, so this avoids creating and running an empty job for them.
   *
   * @param event The event about to be queued.
   * @returns true if a matching subscription exists.
   */
  static async shouldQueue(event: Event): Promise<boolean> {
    if (!event.teamId) {
      return false;
    }

    const subscriptions = await WebhookSubscription.findEnabledByTeamId(
      event.teamId
    );

    return subscriptions.some((subscription) =>
      WebhookSubscription.matchEvent(subscription.events, event.name)
    );
  }

  async perform(event: Event) {
    if (!event.teamId) {
      return;
    }

    const subscriptions = await WebhookSubscription.findEnabledByTeamId(
      event.teamId
    );

    const applicableSubscriptions = subscriptions.filter((subscription) =>
      WebhookSubscription.matchEvent(subscription.events, event.name)
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
