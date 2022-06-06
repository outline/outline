import invariant from "invariant";
import { User, WebhookSubscription } from "@server/models";
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
      webhookSubscriptions.map((webhook: WebhookSubscription) =>
        this.handleEvent(webhook, event)
      )
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
        return this.handleUserEvent(webhookSubscription, event);
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
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: event.name,
          invitee: event.data,
        }),
      });
    } else {
      const hydratedUser = await User.findByPk(event.userId);

      invariant(hydratedUser, "User not found");

      const webhookUrl = webhookSubscription.url;
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event: event.name,
          user: presentUser(hydratedUser),
        }),
      });
    }
  }
}
