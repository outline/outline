import { subHours } from "date-fns";
import { differenceBy, uniqBy } from "lodash";
import { Op } from "sequelize";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import { sequelize } from "@server/database/sequelize";
import CollectionNotificationEmail from "@server/emails/templates/CollectionNotificationEmail";
import DocumentNotificationEmail from "@server/emails/templates/DocumentNotificationEmail";
import MentionNotificationEmail from "@server/emails/templates/MentionNotificationEmail";
import env from "@server/env";
import Logger from "@server/logging/Logger";
import {
  View,
  Document,
  Team,
  Collection,
  User,
  NotificationSetting,
  Subscription,
  Notification,
  Revision,
} from "@server/models";
import DocumentHelper from "@server/models/helpers/DocumentHelper";
import {
  CollectionEvent,
  RevisionEvent,
  Event,
  DocumentEvent,
} from "@server/types";
import parseMentions from "@server/utils/parseMentions";
import BaseProcessor from "./BaseProcessor";

export default class NotificationsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "revisions.create",
    "collections.create",
  ];

  async perform(event: Event) {
    switch (event.name) {
      case "documents.publish":
        return this.documentPublished(event);
      case "revisions.create":
        return this.revisionCreated(event);
      case "collections.create":
        return this.collectionCreated(event);
      default:
    }
  }

  async documentPublished(event: DocumentEvent) {
    // never send notifications when batch importing documents
    if (
      "data" in event &&
      "source" in event.data &&
      event.data.source === "import"
    ) {
      return;
    }

    const [collection, document, team] = await Promise.all([
      Collection.findByPk(event.collectionId),
      Document.findByPk(event.documentId, { includeState: true }),
      Team.findByPk(event.teamId),
    ]);

    if (!document || !team || !collection) {
      return;
    }

    await this.createDocumentSubscriptions(document, event);

    const recipients = await this.getDocumentNotificationRecipients(
      document,
      "documents.publish"
    );

    for (const recipient of recipients) {
      const notify = await this.shouldNotify(document, recipient.user);

      if (notify) {
        const notification = await Notification.create({
          event: event.name,
          userId: recipient.user.id,
          actorId: document.updatedBy.id,
          teamId: team.id,
          documentId: document.id,
        });
        await DocumentNotificationEmail.schedule(
          {
            to: recipient.user.email,
            eventName: "published",
            documentId: document.id,
            teamUrl: team.url,
            actorName: document.updatedBy.name,
            collectionName: collection.name,
            unsubscribeUrl: recipient.unsubscribeUrl,
          },
          { notificationId: notification.id }
        );
      }
    }

    // send notifs to mentioned users
    const mentions = parseMentions(document);
    for (const mention of mentions) {
      const [recipient, actor] = await Promise.all([
        User.findByPk(mention.modelId),
        User.findByPk(mention.actorId),
      ]);
      if (recipient && actor && recipient.id !== actor.id) {
        await MentionNotificationEmail.schedule({
          to: recipient.email,
          documentId: event.documentId,
          actorName: actor.name,
          teamUrl: team.url,
          mentionId: mention.id,
        });
      }
    }
  }

  async revisionCreated(event: RevisionEvent) {
    const [collection, document, revision, team] = await Promise.all([
      Collection.findByPk(event.collectionId),
      Document.findByPk(event.documentId, { includeState: true }),
      Revision.findByPk(event.modelId),
      Team.findByPk(event.teamId),
    ]);

    if (!document || !team || !revision || !collection) {
      return;
    }

    await this.createDocumentSubscriptions(document, event);

    const recipients = await this.getDocumentNotificationRecipients(
      document,
      "documents.update"
    );

    // generate the diff html for the email
    const before = await revision.previous();
    let content = await DocumentHelper.toEmailDiff(before, revision, {
      includeTitle: false,
      centered: false,
    });
    if (!content) {
      return;
    }

    content = await DocumentHelper.attachmentsToSignedUrls(
      content,
      event.teamId,
      86400 * 4
    );

    for (const recipient of recipients) {
      const notify = await this.shouldNotify(document, recipient.user);

      if (notify) {
        const notification = await Notification.create({
          event: event.name,
          userId: recipient.user.id,
          actorId: document.updatedBy.id,
          teamId: team.id,
          documentId: document.id,
        });

        await DocumentNotificationEmail.schedule(
          {
            to: recipient.user.email,
            eventName: "updated",
            documentId: document.id,
            teamUrl: team.url,
            actorName: document.updatedBy.name,
            collectionName: collection.name,
            unsubscribeUrl: recipient.unsubscribeUrl,
            content,
          },
          { notificationId: notification.id }
        );
      }
    }

    // send notifs to newly mentioned users
    const prev = await revision.previous();
    const oldMentions = prev ? parseMentions(prev) : [];
    const newMentions = parseMentions(document);
    const mentions = differenceBy(newMentions, oldMentions, "modelId");
    for (const mention of mentions) {
      const [recipient, actor] = await Promise.all([
        User.findByPk(mention.modelId),
        User.findByPk(mention.actorId),
      ]);
      if (recipient && actor && recipient.id !== actor.id) {
        await MentionNotificationEmail.schedule({
          to: recipient.email,
          documentId: event.documentId,
          actorName: actor.name,
          teamUrl: team.url,
          mentionId: mention.id,
        });
      }
    }
  }

  async collectionCreated(event: CollectionEvent) {
    const collection = await Collection.scope("withUser").findByPk(
      event.collectionId
    );

    if (!collection || !collection.permission) {
      return;
    }

    const recipients = await this.getCollectionNotificationRecipients(
      collection,
      event.name
    );

    for (const recipient of recipients) {
      // Suppress notifications for suspended users
      if (recipient.user.isSuspended || !recipient.user.email) {
        continue;
      }

      await CollectionNotificationEmail.schedule({
        to: recipient.user.email,
        eventName: "created",
        collectionId: collection.id,
        unsubscribeUrl: recipient.unsubscribeUrl,
      });
    }
  }

  /**
   * Create any new subscriptions that might be missing for collaborators in the
   * document on publish and revision creation. This does mean that there is a
   * short period of time where the user is not subscribed after editing until a
   * revision is created.
   *
   * @param document The document to create subscriptions for
   * @param event The event that triggered the subscription creation
   */
  private createDocumentSubscriptions = async (
    document: Document,
    event: DocumentEvent | RevisionEvent
  ): Promise<void> => {
    await sequelize.transaction(async (transaction) => {
      const users = await document.collaborators({ transaction });

      for (const user of users) {
        await subscriptionCreator({
          user,
          documentId: document.id,
          event: "documents.update",
          resubscribe: false,
          transaction,
          ip: event.ip,
        });
      }
    });
  };

  /**
   * Get the recipients of a notification for a collection event.
   *
   * @param collection The collection to get recipients for
   * @param eventName The event name
   * @returns A list of recipients
   */
  private getCollectionNotificationRecipients = async (
    collection: Collection,
    eventName: string
  ): Promise<NotificationSetting[]> => {
    // First find all the users that have notifications enabled for this event
    // type at all and aren't the one that performed the action.
    const recipients = await NotificationSetting.scope("withUser").findAll({
      where: {
        userId: {
          [Op.ne]: collection.createdById,
        },
        teamId: collection.teamId,
        event: eventName,
      },
    });

    // Ensure we only have one recipient per user as a safety measure
    return uniqBy(recipients, "userId");
  };

  /**
   * Get the recipients of a notification for a document event.
   *
   * @param document The document to get recipients for
   * @param eventName The event name
   * @returns A list of recipients
   */
  private getDocumentNotificationRecipients = async (
    document: Document,
    eventName: string
  ): Promise<NotificationSetting[]> => {
    // First find all the users that have notifications enabled for this event
    // type at all and aren't the one that performed the action.
    let recipients = await NotificationSetting.scope("withUser").findAll({
      where: {
        userId: {
          [Op.ne]: document.lastModifiedById,
        },
        teamId: document.teamId,
        event: eventName,
      },
    });

    // If the event is a revision creation we can filter further to only those
    // that have a subscription to the document…
    if (eventName === "documents.update") {
      const subscriptions = await Subscription.findAll({
        attributes: ["userId"],
        where: {
          userId: recipients.map((recipient) => recipient.user.id),
          documentId: document.id,
          event: eventName,
        },
      });

      const subscribedUserIds = subscriptions.map(
        (subscription) => subscription.userId
      );

      recipients = recipients.filter((recipient) =>
        subscribedUserIds.includes(recipient.user.id)
      );
    }

    // Ensure we only have one recipient per user as a safety measure
    return uniqBy(recipients, "userId");
  };

  private shouldNotify = async (
    document: Document,
    user: User
  ): Promise<boolean> => {
    // Suppress notifications for suspended and users with no email address
    if (user.isSuspended || !user.email) {
      return false;
    }

    // Check the recipient has access to the collection this document is in. Just
    // because they are subscribed doesn't meant they still have access to read
    // the document.
    const collectionIds = await user.collectionIds();

    if (!collectionIds.includes(document.collectionId)) {
      return false;
    }

    // Deliver only a single notification in a 12 hour window
    const notification = await Notification.findOne({
      order: [["createdAt", "DESC"]],
      where: {
        userId: user.id,
        documentId: document.id,
        emailedAt: {
          [Op.not]: null,
          [Op.gte]: subHours(new Date(), 12),
        },
      },
    });

    if (notification) {
      if (env.ENVIRONMENT === "development") {
        Logger.info(
          "processor",
          `would have suppressed notification to ${user.id}, but not in development`
        );
      } else {
        Logger.info(
          "processor",
          `suppressing notification to ${user.id} as recently notified`
        );
        return false;
      }
    }

    // If this recipient has viewed the document since the last update was made
    // then we can avoid sending them a useless notification, yay.
    const view = await View.findOne({
      where: {
        userId: user.id,
        documentId: document.id,
        updatedAt: {
          [Op.gt]: document.updatedAt,
        },
      },
    });

    if (view) {
      Logger.info(
        "processor",
        `suppressing notification to ${user.id} because update viewed`
      );
      return false;
    }

    return true;
  };
}
