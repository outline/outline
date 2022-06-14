import invariant from "invariant";
import Logger from "@server/logging/Logger";
import {
  User,
  WebhookDelivery,
  WebhookSubscription,
  Document,
  FileOperation,
  Collection,
  Group,
  Integration,
  Team,
  Pin,
  Star,
} from "@server/models";
import {
  presentCollection,
  presentDocument,
  presentFileOperation,
  presentGroup,
  presentIntegration,
  presentPin,
  presentStar,
  presentTeam,
  presentUser,
  presentWebhook,
  presentWebhookSubscription,
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
  StarEvent,
  TeamEvent,
  UserEvent,
  WebhookSubscriptionEvent,
} from "@server/types";
import BaseProcessor from "./BaseProcessor";

function assertUnreachable(_: never): never {
  throw new Error("Didn't expect to get here");
}

export default class WebhookProcessor extends BaseProcessor {
  static applicableEvents: ["*"] = ["*"];

  async perform(event: Event) {
    const webhookSubscriptions = await WebhookSubscription.findAll({
      where: {
        enabled: true,
        teamId: event.teamId,
      },
    });

    await Promise.all(
      webhookSubscriptions
        .filter((webhook) => webhook.validForEvent(event))
        .map((webhook: WebhookSubscription) => this.handleEvent(webhook, event))
    );
  }

  async handleEvent(
    subscription: WebhookSubscription,
    event: Event
  ): Promise<void> {
    Logger.info(
      "processor",
      `WebhookProcessor.handleEvent: ${event.name} for ${subscription.name}`
    );

    switch (event.name) {
      case "users.create":
      case "users.signin":
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
      case "documents.update.delayed":
      case "documents.update.debounced":
      case "documents.title_change":
        await this.handleDocumentEvent(subscription, event);
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
      case "webhook_subscriptions.create":
      case "webhook_subscriptions.delete":
        await this.handleWebhookSubscriptionEvent(subscription, event);
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

    invariant(hydratedModel, "WebhookSubscription not found");

    await this.sendWebhook({
      event,
      subscription,
      modelPayload: presentWebhookSubscription(hydratedModel),
    });
  }

  async handleStarEvent(
    subscription: WebhookSubscription,
    event: StarEvent
  ): Promise<void> {
    const hydratedModel = await Star.findByPk(event.modelId);

    invariant(hydratedModel, "Star not found");

    await this.sendWebhook({
      event,
      subscription,
      modelPayload: presentStar(hydratedModel),
    });
  }

  async handlePinEvent(
    subscription: WebhookSubscription,
    event: PinEvent
  ): Promise<void> {
    const hydratedModel = await Pin.findByPk(event.modelId);

    invariant(hydratedModel, "Pin not found");

    await this.sendWebhook({
      event,
      subscription,
      modelPayload: presentPin(hydratedModel),
    });
  }

  async handleTeamEvent(
    subscription: WebhookSubscription,
    event: TeamEvent
  ): Promise<void> {
    const hydratedModel = await Team.findByPk(event.teamId);

    invariant(hydratedModel, "Team not found");

    await this.sendWebhook({
      event,
      subscription,
      modelPayload: presentTeam(hydratedModel),
    });
  }

  async handleIntegrationEvent(
    subscription: WebhookSubscription,
    event: IntegrationEvent
  ): Promise<void> {
    const hydratedModel = await Integration.findByPk(event.modelId);

    invariant(hydratedModel, "Integration not found");

    await this.sendWebhook({
      event,
      subscription,
      modelPayload: presentIntegration(hydratedModel),
    });
  }

  async handleGroupEvent(
    subscription: WebhookSubscription,
    event: GroupEvent
  ): Promise<void> {
    const hydratedModel = await Group.findByPk(event.modelId);

    invariant(hydratedModel, "Group not found");

    await this.sendWebhook({
      event,
      subscription,
      modelPayload: presentGroup(hydratedModel),
    });
  }

  async handleCollectionEvent(
    subscription: WebhookSubscription,
    event: CollectionEvent
  ): Promise<void> {
    const hydratedModel = await Collection.findByPk(event.collectionId);

    invariant(hydratedModel, "Collection not found");

    await this.sendWebhook({
      event,
      subscription,
      modelPayload: presentCollection(hydratedModel),
    });
  }

  async handleFileOperationEvent(
    subscription: WebhookSubscription,
    event: FileOperationEvent
  ): Promise<void> {
    const hydratedFileOperation = await FileOperation.findByPk(event.modelId);

    invariant(hydratedFileOperation, "File Operation not found");

    await this.sendWebhook({
      event,
      subscription,
      modelPayload: presentFileOperation(hydratedFileOperation),
    });
  }

  async handleRevisionEvent(
    subscription: WebhookSubscription,
    event: RevisionEvent
  ): Promise<void> {
    const hydratedDocument = await Document.findByPk(event.documentId);

    invariant(hydratedDocument, "Document not found");

    await this.sendWebhook({
      event,
      subscription,
      modelPayload: presentDocument(hydratedDocument),
    });
  }

  async handleDocumentEvent(
    subscription: WebhookSubscription,
    event: DocumentEvent
  ): Promise<void> {
    const hydratedDocument = await Document.findByPk(event.documentId);

    invariant(hydratedDocument, "Document not found");

    await this.sendWebhook({
      event,
      subscription,
      modelPayload: presentDocument(hydratedDocument),
    });
  }

  async handleUserEvent(
    subscription: WebhookSubscription,
    event: UserEvent
  ): Promise<void> {
    if (event.name === "users.invite") {
      const invite = event.data;

      await this.sendWebhook({
        event,
        subscription,
        modelPayload: invite,
      });
    } else {
      const hydratedUser = await User.findByPk(event.userId);

      invariant(hydratedUser, "User not found");

      await this.sendWebhook({
        event,
        subscription,
        modelPayload: presentUser(hydratedUser),
      });
    }
  }

  async sendWebhook({
    event,
    subscription,
    modelPayload,
  }: {
    event: Event;
    subscription: WebhookSubscription;
    modelPayload: unknown;
  }) {
    const delivery = await WebhookDelivery.create({
      webhookSubscriptionId: subscription.id,
      status: "pending",
    });

    const jsonBody = presentWebhook({
      event,
      delivery,
      subscription,
      modelPayload,
    });
    const body = JSON.stringify(jsonBody);

    const webhookUrl = subscription.url;
    const headers = {
      "Content-Type": "application/json",
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body,
    });

    const newStatus = response.ok ? "success" : "failed";

    await delivery.update({
      status: newStatus,
      statusCode: response.status,
      requestBody: jsonBody,
      requestHeaders: headers,
      responseBody: response.body?.toString(),
      responseHeaders: response.headers,
    });

    if (!response.ok) {
      const recentDeliveries = await WebhookDelivery.findAll({
        where: { webhookSubscriptionId: subscription.id },
        order: [["createdAt", "DESC"]],
        limit: 25,
      });

      const allFailed = recentDeliveries.every(
        (delivery) => delivery.status === "failed"
      );

      if (allFailed) {
        await subscription.update({ enabled: false });
      }
    }
  }
}
