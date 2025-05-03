import { FetchError } from "node-fetch";
import { Op } from "sequelize";
import { colorPalette } from "@shared/utils/collections";
import WebhookDisabledEmail from "@server/emails/templates/WebhookDisabledEmail";
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
  UserMembership,
  GroupMembership,
  GroupUser,
  Comment,
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
  presentView,
  presentShare,
  presentMembership,
  presentGroupUser,
  presentGroupMembership,
  presentComment,
} from "@server/presenters";
import BaseTask from "@server/queues/tasks/BaseTask";
import {
  CollectionEvent,
  CollectionGroupEvent,
  CollectionUserEvent,
  CommentEvent,
  DocumentEvent,
  DocumentUserEvent,
  DocumentGroupEvent,
  Event,
  FileOperationEvent,
  GroupEvent,
  GroupUserEvent,
  IntegrationEvent,
  PinEvent,
  RevisionEvent,
  ShareEvent,
  StarEvent,
  TeamEvent,
  UserEvent,
  ViewEvent,
  WebhookDeliveryStatus,
  WebhookSubscriptionEvent,
} from "@server/types";
import fetch from "@server/utils/fetch";
import presentWebhook, { WebhookPayload } from "../presenters/webhook";
import presentWebhookSubscription from "../presenters/webhookSubscription";

function assertUnreachable(event: never) {
  Logger.warn(`DeliverWebhookTask did not handle ${(event as Event).name}`);
}

type Props = {
  subscriptionId: string;
  event: Event;
};

export default class DeliverWebhookTask extends BaseTask<Props> {
  public async perform({ subscriptionId, event }: Props) {
    const subscription = await WebhookSubscription.findByPk(subscriptionId, {
      rejectOnEmpty: true,
    });

    if (!subscription.enabled) {
      Logger.info("task", `WebhookSubscription was disabled before delivery`, {
        event: event.name,
        subscriptionId: subscription.id,
      });
      return;
    }

    Logger.info("task", `DeliverWebhookTask: ${event.name}`, {
      event: event.name,
      subscriptionId: subscription.id,
    });

    switch (event.name) {
      case "api_keys.create":
      case "api_keys.delete":
      case "attachments.create":
      case "attachments.update":
      case "attachments.delete":
      case "subscriptions.create":
      case "subscriptions.delete":
      case "authenticationProviders.update":
      case "notifications.create":
      case "notifications.update":
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
      case "users.promote":
      case "users.demote":
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
      case "documents.move":
      case "documents.update":
      case "documents.title_change":
        await this.handleDocumentEvent(subscription, event);
        return;
      case "documents.add_user":
      case "documents.remove_user":
        await this.handleDocumentUserEvent(subscription, event);
        return;
      case "documents.add_group":
      case "documents.remove_group":
        await this.handleDocumentGroupEvent(subscription, event);
        return;
      case "documents.update.delayed":
      case "documents.update.debounced":
      case "documents.empty_trash":
        // Ignored
        return;
      case "revisions.create":
        await this.handleRevisionEvent(subscription, event);
        return;
      case "fileOperations.create":
      case "fileOperations.update":
      case "fileOperations.delete":
        await this.handleFileOperationEvent(subscription, event);
        return;
      case "collections.create":
      case "collections.update":
      case "collections.delete":
      case "collections.move":
      case "collections.permission_changed":
      case "collections.archive":
      case "collections.restore":
        await this.handleCollectionEvent(subscription, event);
        return;
      case "collections.add_user":
      case "collections.remove_user":
        await this.handleCollectionUserEvent(subscription, event);
        return;
      case "collections.add_group":
      case "collections.remove_group":
        await this.handleCollectionGroupEvent(subscription, event);
        return;
      case "comments.create":
      case "comments.update":
      case "comments.delete":
        await this.handleCommentEvent(subscription, event);
        return;
      case "comments.add_reaction":
      case "comments.remove_reaction":
        // Ignored
        return;
      case "groups.create":
      case "groups.update":
      case "groups.delete":
        await this.handleGroupEvent(subscription, event);
        return;
      case "groups.add_user":
      case "groups.remove_user":
        await this.handleGroupUserEvent(subscription, event);
        return;
      case "integrations.create":
      case "integrations.update":
      case "integrations.delete":
        await this.handleIntegrationEvent(subscription, event);
        return;
      case "teams.create":
      case "teams.delete":
      case "teams.destroy":
        // Ignored
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
      case "webhookSubscriptions.create":
      case "webhookSubscriptions.delete":
      case "webhookSubscriptions.update":
        await this.handleWebhookSubscriptionEvent(subscription, event);
        return;
      case "views.create":
        await this.handleViewEvent(subscription, event);
        return;
      case "userMemberships.update":
        // Ignored
        return;
      case "imports.create":
      case "imports.update":
      case "imports.processed":
      case "imports.delete":
        // Ignored
        return;
      case "oauthClients.create":
      case "oauthClients.update":
      case "oauthClients.delete":
        // Ignored
        return;
      default:
        assertUnreachable(event);
    }
  }

  private async handleWebhookSubscriptionEvent(
    subscription: WebhookSubscription,
    event: WebhookSubscriptionEvent
  ): Promise<void> {
    const model = await WebhookSubscription.findByPk(event.modelId, {
      paranoid: false,
    });

    let data = null;
    if (model) {
      data = {
        ...presentWebhookSubscription(model),
        secret: undefined,
      };
    }

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: data,
      },
    });
  }

  private async handleViewEvent(
    subscription: WebhookSubscription,
    event: ViewEvent
  ): Promise<void> {
    const model = await View.scope("withUser").findByPk(event.modelId, {
      paranoid: false,
    });

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: model && presentView(model),
      },
    });
  }

  private async handleStarEvent(
    subscription: WebhookSubscription,
    event: StarEvent
  ): Promise<void> {
    const model = await Star.findByPk(event.modelId, {
      paranoid: false,
    });

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: model && presentStar(model),
      },
    });
  }

  private async handleShareEvent(
    subscription: WebhookSubscription,
    event: ShareEvent
  ): Promise<void> {
    const model = await Share.findByPk(event.modelId, {
      paranoid: false,
    });

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: model && presentShare(model),
      },
    });
  }

  private async handleCommentEvent(
    subscription: WebhookSubscription,
    event: CommentEvent
  ): Promise<void> {
    const model = await Comment.findByPk(event.modelId, {
      paranoid: false,
    });
    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: model && presentComment(model),
      },
    });
  }

  private async handlePinEvent(
    subscription: WebhookSubscription,
    event: PinEvent
  ): Promise<void> {
    const model = await Pin.findByPk(event.modelId, {
      paranoid: false,
    });

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: model && presentPin(model),
      },
    });
  }

  private async handleTeamEvent(
    subscription: WebhookSubscription,
    event: TeamEvent
  ): Promise<void> {
    const model = await Team.scope("withDomains").findByPk(event.teamId, {
      paranoid: false,
    });

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.teamId,
        model: model && presentTeam(model),
      },
    });
  }

  private async handleIntegrationEvent(
    subscription: WebhookSubscription,
    event: IntegrationEvent
  ): Promise<void> {
    const model = await Integration.findByPk(event.modelId, {
      paranoid: false,
    });

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: model && presentIntegration(model),
      },
    });
  }

  private async handleGroupEvent(
    subscription: WebhookSubscription,
    event: GroupEvent
  ): Promise<void> {
    const model = await Group.findByPk(event.modelId, {
      paranoid: false,
    });

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: model && (await presentGroup(model)),
      },
    });
  }

  private async handleGroupUserEvent(
    subscription: WebhookSubscription,
    event: GroupUserEvent
  ): Promise<void> {
    const model = await GroupUser.scope(["withUser", "withGroup"]).findOne({
      where: {
        groupId: event.modelId,
        userId: event.userId,
      },
      paranoid: false,
    });

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: `${event.userId}-${event.modelId}`,
        model: model && presentGroupUser(model),
        group: model && (await presentGroup(model.group)),
        user: model && presentUser(model.user),
      },
    });
  }

  private async handleCollectionEvent(
    subscription: WebhookSubscription,
    event: CollectionEvent
  ): Promise<void> {
    const model = await Collection.findByPk(event.collectionId, {
      paranoid: false,
    });

    const collection = model && (await presentCollection(undefined, model));
    if (collection) {
      // For backward compatibility, set a default color.
      collection.color = collection.color ?? colorPalette[0];
    }

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.collectionId,
        model: collection,
      },
    });
  }

  private async handleCollectionUserEvent(
    subscription: WebhookSubscription,
    event: CollectionUserEvent
  ): Promise<void> {
    const model = await UserMembership.scope([
      "withUser",
      "withCollection",
    ]).findOne({
      where: {
        collectionId: event.collectionId,
        userId: event.userId,
      },
      paranoid: false,
    });

    const collection =
      model && (await presentCollection(undefined, model.collection!));
    if (collection) {
      // For backward compatibility, set a default color.
      collection.color = collection.color ?? colorPalette[0];
    }

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: model && presentMembership(model),
        collection,
        user: model && presentUser(model.user),
      },
    });
  }

  private async handleCollectionGroupEvent(
    subscription: WebhookSubscription,
    event: CollectionGroupEvent
  ): Promise<void> {
    const model = await GroupMembership.scope([
      "withGroup",
      "withCollection",
    ]).findOne({
      where: {
        collectionId: event.collectionId,
        groupId: event.modelId,
      },
      paranoid: false,
    });

    const collection =
      model && (await presentCollection(undefined, model.collection!));
    if (collection) {
      // For backward compatibility, set a default color.
      collection.color = collection.color ?? colorPalette[0];
    }

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: model && presentGroupMembership(model),
        collection,
        group: model && (await presentGroup(model.group)),
      },
    });
  }

  private async handleFileOperationEvent(
    subscription: WebhookSubscription,
    event: FileOperationEvent
  ): Promise<void> {
    const model = await FileOperation.findByPk(event.modelId, {
      paranoid: false,
    });

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: model && presentFileOperation(model),
      },
    });
  }

  private async handleDocumentEvent(
    subscription: WebhookSubscription,
    event: DocumentEvent
  ): Promise<void> {
    const model = await Document.findByPk(event.documentId, {
      paranoid: false,
    });

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.documentId,
        model:
          model &&
          (await presentDocument(undefined, model, {
            includeData: true,
            includeText: true,
          })),
      },
    });
  }

  private async handleDocumentUserEvent(
    subscription: WebhookSubscription,
    event: DocumentUserEvent
  ): Promise<void> {
    const model = await UserMembership.scope([
      "withUser",
      "withDocument",
    ]).findOne({
      where: {
        documentId: event.documentId,
        userId: event.userId,
      },
      paranoid: false,
    });

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: model && presentMembership(model),
        document:
          model &&
          (await presentDocument(undefined, model.document!, {
            includeData: true,
            includeText: true,
          })),
        user: model && presentUser(model.user),
      },
    });
  }

  private async handleDocumentGroupEvent(
    subscription: WebhookSubscription,
    event: DocumentGroupEvent
  ): Promise<void> {
    const model = await GroupMembership.scope([
      "withGroup",
      "withDocument",
    ]).findOne({
      where: {
        documentId: event.documentId,
        groupId: event.modelId,
      },
      paranoid: false,
    });

    const document =
      model && (await presentDocument(undefined, model.document!));

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: model && presentGroupMembership(model),
        document,
        group: model && (await presentGroup(model.group)),
      },
    });
  }

  private async handleRevisionEvent(
    subscription: WebhookSubscription,
    event: RevisionEvent
  ): Promise<void> {
    const [model, document] = await Promise.all([
      Revision.findByPk(event.modelId, {
        paranoid: false,
      }),
      Document.findByPk(event.documentId, {
        paranoid: false,
      }),
    ]);

    const data = {
      ...(model ? await presentRevision(model) : {}),
      collectionId: document ? document.collectionId : undefined,
    };

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.modelId,
        model: data,
      },
    });
  }

  private async handleUserEvent(
    subscription: WebhookSubscription,
    event: UserEvent
  ): Promise<void> {
    const model = await User.findByPk(event.userId, {
      paranoid: false,
    });

    await this.sendWebhook({
      event,
      subscription,
      payload: {
        id: event.userId,
        model: model && presentUser(model),
      },
    });
  }

  private async sendWebhook({
    event,
    subscription,
    payload,
  }: {
    event: Event;
    subscription: WebhookSubscription;
    payload: WebhookPayload;
  }) {
    const delivery = await WebhookDelivery.create({
      webhookSubscriptionId: subscription.id,
      status: "pending",
    });

    let response, requestBody, requestHeaders;
    let status: WebhookDeliveryStatus;
    try {
      requestBody = presentWebhook({
        event,
        delivery,
        payload,
      });
      requestHeaders = {
        "Content-Type": "application/json",
        "user-agent": `Outline-Webhooks${
          env.VERSION ? `/${env.VERSION.slice(0, 7)}` : ""
        }`,
      } as Record<string, string>;

      const signature = subscription.signature(JSON.stringify(requestBody));
      if (signature) {
        requestHeaders["Outline-Signature"] = signature;
      }

      response = await fetch(subscription.url, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
        redirect: "error",
        timeout: 5000,
      });
      status = response.ok ? "success" : "failed";
    } catch (err) {
      if (err instanceof FetchError && env.isCloudHosted) {
        Logger.warn(`Failed to send webhook: ${err.message}`, {
          event,
          deliveryId: delivery.id,
        });
      } else {
        Logger.error("Failed to send webhook", err, {
          event,
          deliveryId: delivery.id,
        });
      }
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

    if (status === "failed") {
      try {
        await this.checkAndDisableSubscription(subscription);
      } catch (err) {
        Logger.error("Failed to check and disable recent deliveries", err, {
          event,
          deliveryId: delivery.id,
        });
      }
    }
  }

  private async checkAndDisableSubscription(subscription: WebhookSubscription) {
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
      // If the last 25 deliveries failed, disable the subscription
      await subscription.disable();

      // Send an email to the creator of the webhook to let them know
      const [createdBy, team] = await Promise.all([
        User.findOne({
          where: {
            id: subscription.createdById,
            suspendedAt: { [Op.is]: null },
          },
        }),
        subscription.$get("team"),
      ]);

      if (createdBy && team) {
        await new WebhookDisabledEmail({
          to: createdBy.email,
          teamUrl: team.url,
          webhookName: subscription.name,
        }).schedule();
      }
    }
  }
}
