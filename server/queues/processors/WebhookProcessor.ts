import invariant from "invariant";
import { User, WebhookDelivery, WebhookSubscription } from "@server/models";
import { presentUser } from "@server/presenters";
import { Event, UserEvent } from "@server/types";
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
      webhookSubscriptions.map((webhook: WebhookSubscription) => {
        if (webhook.validForEvent(event)) {
          this.handleEvent(webhook, event);
        }
      })
    );
  }

  async handleEvent(
    webhookSubscription: WebhookSubscription,
    event: Event
  ): Promise<void> {
    switch (event.name) {
      case "users.create":
      case "users.signin":
      case "users.update":
      case "users.suspend":
      case "users.activate":
      case "users.delete":
      case "users.invite":
        this.handleUserEvent(webhookSubscription, event);
        return;
    }
    console.error(`Unhandled event: ${event.name}`);
  }

  async handleUserEvent(
    webhookSubscription: WebhookSubscription,
    event: UserEvent
  ) {
    console.debug(
      `WebhookProcessor.handleUserEvent: ${event.name} for ${webhookSubscription.name}`
    );

    if (event.name === "users.invite") {
      const webhookUrl = webhookSubscription.url;
      const body = {
        event: event.name,
        invitee: event.data,
      };
      const headers = {
        "Content-Type": "application/json",
      };
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      await WebhookDelivery.create({
        webhookSubscriptionId: webhookSubscription.id,
        statusCode: response.status,
        requestBody: body,
        requestHeaders: headers,
        responseBody: response.body,
        responseHeaders: response.headers,
      });
    } else {
      const hydratedUser = await User.findByPk(event.userId);

      invariant(hydratedUser, "User not found");

      const webhookUrl = webhookSubscription.url;
      const headers = {
        "Content-Type": "application/json",
      };
      const body = {
        event: event.name,
        user: presentUser(hydratedUser),
      };
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      await WebhookDelivery.create({
        webhookSubscriptionId: webhookSubscription.id,
        statusCode: response.status,
        requestBody: body,
        requestHeaders: headers,
        responseBody: response.body?.toString(),
        responseHeaders: response.headers,
      });
    }
  }
}
