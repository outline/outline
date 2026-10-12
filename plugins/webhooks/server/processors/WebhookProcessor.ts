import {
  Collection,
  Document,
  FileOperation,
  WebhookSubscription,
} from "@server/models";
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

    let applicableSubscriptions = subscriptions.filter((subscription) =>
      WebhookSubscription.matchEvent(subscription.events, event.name)
    );
    if (!applicableSubscriptions.length) {
      return;
    }

    // Events in a personal collection only go to webhooks of its owner.
    const ownerId = await this.getPersonalOwnerId(event);
    if (ownerId) {
      const owned = await WebhookSubscription.unscoped().findAll({
        attributes: ["id"],
        where: {
          id: applicableSubscriptions.map((subscription) => subscription.id),
          createdById: ownerId,
        },
      });
      const ownedIds = new Set(owned.map((subscription) => subscription.id));
      applicableSubscriptions = applicableSubscriptions.filter((subscription) =>
        ownedIds.has(subscription.id)
      );
    }

    await Promise.all(
      applicableSubscriptions.map((subscription) =>
        new DeliverWebhookTask().schedule({
          event,
          subscriptionId: subscription.id,
        })
      )
    );
  }

  /**
   * Find the owner of the personal collection that an event relates to.
   *
   * @param event The event to check.
   * @returns the id of the owner, or null if the event is not in a personal collection.
   */
  private async getPersonalOwnerId(event: Event): Promise<string | null> {
    const modelId = "modelId" in event ? event.modelId : null;
    let collectionId = "collectionId" in event ? event.collectionId : null;
    let documentId = "documentId" in event ? event.documentId : null;

    if (event.name.startsWith("collections.")) {
      collectionId = collectionId ?? modelId ?? null;
    }

    if (event.name.startsWith("fileOperations.") && modelId) {
      const fileOperation = await FileOperation.unscoped().findOne({
        attributes: ["collectionId", "documentId"],
        where: { id: modelId },
        paranoid: false,
      });
      collectionId = collectionId ?? fileOperation?.collectionId ?? null;
      documentId = documentId ?? fileOperation?.documentId ?? null;
    }

    if (!collectionId && documentId) {
      const document = await Document.unscoped().findOne({
        attributes: ["collectionId"],
        where: { id: documentId },
        paranoid: false,
      });
      collectionId = document?.collectionId ?? null;
    }

    if (!collectionId) {
      return null;
    }

    const collection = await Collection.unscoped().findOne({
      attributes: ["ownerId"],
      where: { id: collectionId },
      paranoid: false,
    });
    return collection?.ownerId ?? null;
  }
}
