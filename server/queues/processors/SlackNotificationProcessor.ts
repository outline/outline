import {
  IntegrationService,
  NotificationChannelType,
  NotificationEventType,
} from "@shared/types";
import { Notification, IntegrationAuthentication } from "@server/models";
import type { Event, NotificationEvent } from "@server/types";
import * as Slack from "../../../plugins/slack/server/slack";
import BaseProcessor from "./BaseProcessor";
import Logger from "@server/logging/Logger";
import { paragraph, root, strong, text, link } from "chat";

/**
 * Processor for sending Slack DM notifications.
 * Listens for notification.create events and sends Slack DMs to users
 * who have linked their Slack accounts and enabled Slack notifications.
 */
export default class SlackNotificationProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = ["notifications.create"];

  async perform(event: NotificationEvent) {
    const notification = await Notification.scope([
      "withTeam",
      "withUser",
      "withActor",
    ]).findByPk(event.modelId);

    if (!notification) {
      return;
    }

    if (notification.user.isSuspended) {
      return;
    }

    // Check if user has Slack notifications enabled for this event type
    if (
      !notification.user.subscribedToEventType(
        notification.event,
        NotificationChannelType.Slack
      )
    ) {
      return;
    }

    const slackUserId = await notification.user.getSlackUserId();
    if (!slackUserId) {
      Logger.info(
        "processor",
        `User ${notification.userId} has no linked Slack account`
      );
      return;
    }

    const auth = await IntegrationAuthentication.findOne({
      where: {
        service: IntegrationService.Slack,
        teamId: notification.user.teamId,
      },
    });

    if (!auth) {
      Logger.debug(
        "plugins",
        "No Slack integration authentication found for team",
        {
          teamId: notification.user.teamId,
        }
      );
      return;
    }

    try {
      const message = this.formatSlackMessage(notification);

      await Slack.postMessage({
        token: auth?.token,
        channel: slackUserId,
        message,
      });

      await notification.update({
        slackSentAt: new Date(),
      });

      Logger.info(
        "processor",
        `Slack DM sent for notification ${notification.id}`
      );
    } catch (error) {
      Logger.error(
        `Failed to send Slack DM for notification ${notification.id}`,
        error
      );
    }
  }

  /**
   * Format a notification into a Slack message with rich formatting.
   *
   * @param notification - the notification to format.
   * @returns the formatted Slack message.
   */
  private formatSlackMessage(notification: Notification) {
    const actorName = notification.actor.name;
    const teamUrl = notification.team.url;
    let textContent = "";
    let url = "";

    switch (notification.event) {
      case NotificationEventType.PublishDocument:
        textContent = `${actorName} published a new document`;
        url = `${teamUrl}/doc/${notification.documentId}`;
        break;

      case NotificationEventType.UpdateDocument:
        textContent = `${actorName} updated a document you're subscribed to`;
        url = `${teamUrl}/doc/${notification.documentId}`;
        break;

      case NotificationEventType.MentionedInDocument:
        textContent = `${actorName} mentioned you in a document`;
        url = `${teamUrl}/doc/${notification.documentId}`;
        break;

      case NotificationEventType.MentionedInComment:
        textContent = `${actorName} mentioned you in a comment`;
        url = `${teamUrl}/doc/${notification.documentId}?commentId=${notification.commentId}`;
        break;

      case NotificationEventType.GroupMentionedInDocument:
        textContent = `${actorName} mentioned a group you're in`;
        url = `${teamUrl}/doc/${notification.documentId}`;
        break;

      case NotificationEventType.GroupMentionedInComment:
        textContent = `${actorName} mentioned a group you're in`;
        url = `${teamUrl}/doc/${notification.documentId}?commentId=${notification.commentId}`;
        break;

      case NotificationEventType.CreateComment:
        textContent = `${actorName} commented on a document you're subscribed to`;
        url = `${teamUrl}/doc/${notification.documentId}?commentId=${notification.commentId}`;
        break;

      case NotificationEventType.ResolveComment:
        textContent = `${actorName} resolved a comment thread you participated in`;
        url = `${teamUrl}/doc/${notification.documentId}?commentId=${notification.commentId}`;
        break;

      case NotificationEventType.CreateCollection:
        textContent = `A new collection was created`;
        url = `${teamUrl}/collection/${notification.collectionId}`;
        break;

      case NotificationEventType.AddUserToDocument:
        textContent = `${actorName} shared a document with you`;
        url = `${teamUrl}/doc/${notification.documentId}`;
        break;

      case NotificationEventType.AddUserToCollection:
        textContent = `${actorName} shared a collection with you`;
        url = `${teamUrl}/collection/${notification.collectionId}`;
        break;

      default:
        textContent = `You have a new notification from ${actorName}`;
        url = teamUrl;
    }

    const message = {
      ast: root([
        paragraph([
          strong([text(textContent)]),
          text("\n"),
          link(url, [text("View")]),
        ]),
      ]),
    };

    return message;
  }
}
