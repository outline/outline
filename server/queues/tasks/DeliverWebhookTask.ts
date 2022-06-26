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
import BaseTask from "./BaseTask";

function assertUnreachable(_: never): never {
  throw new Error("Didn't expect to get here");
}

type Props = {
  subscription: WebhookSubscription;
  event: Event;
};

export default class DeliverWebhookTask extends BaseTask<Props> {
  public async perform({ subscription, event }: Props) {
    Logger.info(
      "task",
      `DeliverWebhookTask: ${event.name} for ${subscription.name}`
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
        await this.handleDocumentEvent(subscription, event);
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
      case "webhook_subscriptions.update":
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

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.modelId,
      modelPayload: hydratedModel && presentWebhookSubscription(hydratedModel),
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
    const hydratedModel = await Team.findByPk(event.teamId);

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
    event: DocumentEvent | RevisionEvent
  ): Promise<void> {
    const hydratedDocument = await Document.findByPk(event.documentId);

    await this.sendModelWebhook({
      event,
      subscription,
      modelId: event.documentId,
      modelPayload: hydratedDocument && presentDocument(hydratedDocument),
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
        payload: { model: invite },
      });
    } else {
      const hydratedUser = await User.findByPk(event.userId);

      await this.sendModelWebhook({
        event,
        subscription,
        modelId: event.userId,
        modelPayload: hydratedUser && presentUser(hydratedUser),
      });
    }
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

    const jsonBody = presentWebhook({
      event,
      delivery,
      payload,
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
      responseBody: await response.text(),
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

      if (recentDeliveries.length === 25 && allFailed) {
        await subscription.update({ enabled: false });
      }
    }
  }
}
