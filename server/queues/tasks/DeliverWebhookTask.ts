import invariant from "invariant";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import {
  Collection,
  FileOperation,
  Group,
  Integration,
  Pin,
  Star,
  Team,
  WebhookDelivery,
  WebhookSubscription,
  Document,
  User,
  Revision,
  View,
  Share,
} from "@server/models";
import {
  presentCollection,
  presentDocument,
  presentRevision,
  presentFileOperation,
  presentGroup,
  presentIntegration,
  presentPin,
  presentStar,
  presentTeam,
  presentUser,
  presentWebhook,
  presentWebhookSubscription,
  presentView,
  presentShare,
} from "@server/presenters";
import {
  CollectionEvent,
  DocumentEvent,
  Event,
  FileOperationEvent,
  GroupEvent,
  IntegrationEvent,
  PinEvent,
  RevisionEvent,
  ShareEvent,
  StarEvent,
  TeamEvent,
  UserEvent,
  ViewEvent,
  WebhookSubscriptionEvent,
} from "@server/types";
import BaseTask from "./BaseTask";

function assertUnreachable(event: never) {
  Logger.warn(`DeliverWebhookTask did not handle ${(event as any).name}`);
}

type Props = {
  subscriptionId: string;
  event: Event;
};

export default class DeliverWebhookTask extends BaseTask<Props> {
  public async perform({ subscriptionId, event }: Props) {
    const subscription = await WebhookSubscription.findByPk(subscriptionId);
    invariant(subscription, "Subscription not found");

    Logger.info(
      "task",
      `DeliverWebhookTask: ${event.name} for ${subscription.name}`
    );

    switch (event.name) {
      case "api_keys.create":
      case "api_keys.delete":
        // Ignored
        return;
      case "users.create":
      case "users.signin":
      case "users.signout":
      case "users.update":
      case "users.suspend":
      case "users.activate":
      case "users.delete":
      case "users.invite":
        await this.handleUserEvent(subscription, event);
        return;
      case "documents.create":
      case "documents.publish":
      case "documents.unpublish":
      case "documents.delete":
      case "documents.permanent_delete":
      case "documents.archive":
      case "documents.unarchive":
      case "documents.restore":
      case "documents.star":
      case "documents.unstar":
      case "documents.move":
      case "documents.update":
      case "documents.title_change":
        await this.handleDocumentEvent(subscription, event);
        return;
      case "documents.update.delayed":
      case "documents.update.debounced":
        // Ignored
        return;
      case "revisions.create":
        await this.handleRevisionEvent(subscription, event);
        return;
      case "fileOperations.create":
      case "fileOperations.update":
      case "fileOperation.delete":
        await this.handleFileOperationEvent(subscription, event);
        return;
      case "collections.create":
      case "collections.update":
      case "collections.delete":
      case "collections.add_user":
      case "collections.remove_user":
      case "collections.add_group":
      case "collections.remove_group":
      case "collections.move":
      case "collections.permission_changed":
        await this.handleCollectionEvent(subscription, event);
        return;
      case "groups.create":
      case "groups.update":
      case "groups.delete":
      case "groups.add_user":
      case "groups.remove_user":
        await this.handleGroupEvent(subscription, event);
        return;
      case "integrations.create":
      case "integrations.update":
        await this.handleIntegrationEvent(subscription, event);
        return;
      case "teams.update":
        await this.handleTeamEvent(subscription, event);
        return;
      case "pins.create":
      case "pins.update":
      case "pins.delete":
        await this.handlePinEvent(subscription, event);
        return;
      case "stars.create":
      case "stars.update":
      case "stars.delete":
        await this.handleStarEvent(subscription, event);
        return;
      case "shares.create":
      case "shares.update":
      case "shares.revoke":
        await this.handleShareEvent(subscription, event);
        return;
      case "webhook_subscriptions.create":
      case "webhook_subscriptions.delete":
      case "webhook_subscriptions.update":
        await this.handleWebhookSubscriptionEvent(subscription, event);
        return;
      case "views.create":
        await this.handleViewEvent(subscription, event);
        return;
      default:
        assertUnreachable(event);
    }
  }

  async handleWebhookSubscriptionEvent(
    subscription: WebhookSubscription,
    event: WebhookSubscriptionEvent
  ): Promise<void> {
    const hydratedModel = await WebhookSubscription.findByPk(event.modelId);

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.modelId,
      modelPayload: hydratedModel && presentWebhookSubscription(hydratedModel),
    });
  }

  async handleViewEvent(
    subscription: WebhookSubscription,
    event: ViewEvent
  ): Promise<void> {
    const hydratedModel = await View.scope("withUser").findByPk(event.modelId);

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.modelId,
      modelPayload: hydratedModel && presentView(hydratedModel),
    });
  }

  async handleStarEvent(
    subscription: WebhookSubscription,
    event: StarEvent
  ): Promise<void> {
    const hydratedModel = await Star.findByPk(event.modelId);

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.modelId,
      modelPayload: hydratedModel && presentStar(hydratedModel),
    });
  }

  async handleShareEvent(
    subscription: WebhookSubscription,
    event: ShareEvent
  ): Promise<void> {
    const hydratedModel = await Share.findByPk(event.modelId);

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.modelId,
      modelPayload: hydratedModel && presentShare(hydratedModel),
    });
  }

  async handlePinEvent(
    subscription: WebhookSubscription,
    event: PinEvent
  ): Promise<void> {
    const hydratedModel = await Pin.findByPk(event.modelId);

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.modelId,
      modelPayload: hydratedModel && presentPin(hydratedModel),
    });
  }

  async handleTeamEvent(
    subscription: WebhookSubscription,
    event: TeamEvent
  ): Promise<void> {
    const hydratedModel = await Team.scope("withDomains").findByPk(
      event.teamId
    );

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.teamId,
      modelPayload: hydratedModel && presentTeam(hydratedModel),
    });
  }

  async handleIntegrationEvent(
    subscription: WebhookSubscription,
    event: IntegrationEvent
  ): Promise<void> {
    const hydratedModel = await Integration.findByPk(event.modelId);

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.modelId,
      modelPayload: hydratedModel && presentIntegration(hydratedModel),
    });
  }

  async handleGroupEvent(
    subscription: WebhookSubscription,
    event: GroupEvent
  ): Promise<void> {
    const hydratedModel = await Group.findByPk(event.modelId);

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.modelId,
      modelPayload: hydratedModel && presentGroup(hydratedModel),
    });
  }

  async handleCollectionEvent(
    subscription: WebhookSubscription,
    event: CollectionEvent
  ): Promise<void> {
    const hydratedModel = await Collection.findByPk(event.collectionId);

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.collectionId,
      modelPayload: hydratedModel && presentCollection(hydratedModel),
    });
  }

  async handleFileOperationEvent(
    subscription: WebhookSubscription,
    event: FileOperationEvent
  ): Promise<void> {
    const hydratedFileOperation = await FileOperation.findByPk(event.modelId);

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.modelId,
      modelPayload:
        hydratedFileOperation && presentFileOperation(hydratedFileOperation),
    });
  }

  async handleDocumentEvent(
    subscription: WebhookSubscription,
    event: DocumentEvent
  ): Promise<void> {
    const hydratedDocument = await Document.findByPk(event.documentId);

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.documentId,
      modelPayload:
        hydratedDocument && (await presentDocument(hydratedDocument)),
    });
  }

  async handleRevisionEvent(
    subscription: WebhookSubscription,
    event: RevisionEvent
  ): Promise<void> {
    const hydratedRevision = await Revision.findByPk(event.modelId);

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.modelId,
      modelPayload:
        hydratedRevision && (await presentRevision(hydratedRevision)),
    });
  }

  async handleUserEvent(
    subscription: WebhookSubscription,
    event: UserEvent
  ): Promise<void> {
    const hydratedUser = await User.findByPk(event.userId);

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.userId,
      modelPayload: hydratedUser && presentUser(hydratedUser),
    });
  }

  async sendModelWebhook({
    event,
    subscription,
    modelPayload,
    modelId,
  }: {
    event: Event;
    subscription: WebhookSubscription;
    modelPayload: unknown;
    modelId: string;
  }) {
    const payload = {
      id: modelId,
      model: modelPayload,
    };
    await this.sendWebhook({ event, subscription, payload });
  }

  async sendWebhook({
    event,
    subscription,
    payload,
  }: {
    event: Event;
    subscription: WebhookSubscription;
    payload: { model: unknown; id?: string };
  }) {
    const delivery = await WebhookDelivery.create({
      webhookSubscriptionId: subscription.id,
      status: "pending",
    });

    let response, requestBody, requestHeaders, status;
    try {
      requestBody = presentWebhook({
        event,
        delivery,
        payload,
      });
      requestHeaders = {
        "Content-Type": "application/json",
        "user-agent": `Outline-Webhooks${env.VERSION ? `/${env.VERSION}` : ""}`,
      };
      response = await fetch(subscription.url, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
      });
      status = response.ok ? "success" : "failed";
    } catch (err) {
      status = "failed";
    }

    await delivery.update({
      status,
      statusCode: response ? response.status : null,
      requestBody,
      requestHeaders,
      responseBody: response ? await response.text() : "",
      responseHeaders: response
        ? Object.fromEntries(response.headers.entries())
        : {},
    });

    if (response && !response.ok) {
      const recentDeliveries = await WebhookDelivery.findAll({
        where: {
          webhookSubscriptionId: subscription.id,
        },
        order: [["createdAt", "DESC"]],
        limit: 25,
      });

      const allFailed = recentDeliveries.every(
        (delivery) => delivery.status === "failed"
      );

      if (recentDeliveries.length === 25 && allFailed) {
        await subscription.update({ enabled: false });
      }
    }
  }
}
