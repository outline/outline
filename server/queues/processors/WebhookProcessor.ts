import invariant from "invariant";
import Logger from "@server/logging/Logger";
import {
  User,
  WebhookDelivery,
  WebhookSubscription,
  Document,
} from "@server/models";
import {
  presentDocument,
  presentUser,
  presentWebhook,
} from "@server/presenters";
import { DocumentEvent, Event, UserEvent } from "@server/types";
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
    }
    console.error(`Unhandled event: ${event.name}`);
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
