import { Op } from "sequelize";
import subscriptionCreator from "@server/commands/subscriptionCreator";
import { sequelize } from "@server/database/sequelize";
import CollectionNotificationEmail from "@server/emails/templates/CollectionNotificationEmail";
import DocumentNotificationEmail from "@server/emails/templates/DocumentNotificationEmail";
import Logger from "@server/logging/Logger";
import {
  View,
  Document,
  Team,
  Collection,
  User,
  NotificationSetting,
  Subscription,
} from "@server/models";
import { can } from "@server/policies";
import {
  CollectionEvent,
  RevisionEvent,
  Event,
  DocumentActionEvent,
} from "@server/types";
import BaseProcessor from "./BaseProcessor";

type EmailRequirements = {
  user: User;
  document: Document;
  unsubscribeUrl: string;
};

export default class NotificationsProcessor extends BaseProcessor {
  static applicableEvents: Event["name"][] = [
    "documents.publish",
    "revisions.create",
    "collections.create",
  ];

  async perform(event: Event) {
    switch (event.name) {
      case "documents.publish":
      case "revisions.create":
        return this.documentUpdated(event);

      case "collections.create":
        return this.collectionCreated(event);

      default:
    }
  }

  async documentUpdated(event: DocumentActionEvent | RevisionEvent) {
    // never send notifications when batch importing documents
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'data' does not exist on type 'DocumentEv... Remove this comment to see the full error message
    if (event.data?.source === "import") {
      return;
    }

    const [collection, document, team] = await Promise.all([
      Collection.findByPk(event.collectionId),
      Document.findByPk(event.documentId),
      Team.findByPk(event.teamId),
    ]);

    if (!document || !team || !collection) {
      return;
    }

    // Create any new subscriptions that might be missing for collaborators to
    // the document on publish and revision creation. This does mean that there
    // is a short period of time where the user is not subscribed after editing
    // until a revision is created.
    await this.createSubscriptions(document, event);

    const recipients = await this.getRecipients(document, event);

    for (const recipient of recipients) {
      const notify = await this.shouldNotify(event, recipient.user, document);

      if (notify) {
        await DocumentNotificationEmail.schedule({
          to: recipient.user.email,
          eventName: this.notificationEventName(event.name),
          documentId: document.id,
          teamUrl: team.url,
          actorName: document.updatedBy.name,
          collectionName: collection.name,
          unsubscribeUrl: recipient.unsubscribeUrl,
        });
      }
    }
  }

  async collectionCreated(event: CollectionEvent) {
    const collection = await Collection.findByPk(event.collectionId, {
      include: [
        {
          model: User,
          required: true,
          as: "user",
        },
      ],
    });
    if (!collection) {
      return;
    }
    if (!collection.permission) {
      return;
    }
    const notificationSettings = await NotificationSetting.findAll({
      where: {
        userId: {
          [Op.ne]: collection.createdById,
        },
        teamId: collection.teamId,
        event: event.name,
      },
      include: [
        {
          model: User,
          required: true,
          as: "user",
        },
      ],
    });

    for (const setting of notificationSettings) {
      // Suppress notifications for suspended users
      if (setting.user.isSuspended || !setting.user.email) {
        continue;
      }

      await CollectionNotificationEmail.schedule({
        to: setting.user.email,
        eventName: "created",
        collectionId: collection.id,
        unsubscribeUrl: setting.unsubscribeUrl,
      });
    }
  }

  private createSubscriptions = async (
    document: Document,
    event: DocumentActionEvent | RevisionEvent
  ): Promise<void> => {
    await sequelize.transaction(async (transaction) => {
      const users = await document.collaborators({ transaction });

      for (const user of users) {
        if (user && can(user, "subscribe", document)) {
          await subscriptionCreator({
            user: user,
            documentId: document.id,
            event: "documents.update",
            resubscribe: false,
            transaction,
            ip: event.ip,
          });
        }
      }
    });
  };

  private getRecipients = async (
    document: Document,
    event: DocumentActionEvent | RevisionEvent
  ): Promise<EmailRequirements[]> => {
    const allSubscriptions = await Subscription.scope("withUser").findAll({
      where: {
        userId: {
          [Op.ne]: document.lastModifiedById,
        },
        documentId: document.id,
        event: "documents.update",
      },
      paranoid: false,
    });

    const subscriptions = allSubscriptions.filter(
      (subscription) => subscription.deletedAt === null
    );

    const subscriptionRecipients: EmailRequirements[] = subscriptions.map(
      (subscription) => ({
        user: subscription.user,
        document: document,
        unsubscribeUrl: document.url,
      })
    );

    let notificationRecipients: EmailRequirements[] = [];

    if (event.name === "documents.publish") {
      const notificationSettings = await NotificationSetting.scope(
        "withUser"
      ).findAll({
        where: {
          userId: {
            [Op.ne]: document.lastModifiedById,
          },
          teamId: document.teamId,
          event: "documents.publish",
        },
      });

      notificationRecipients = notificationSettings.map((setting) => ({
        user: setting.user,
        document: document,
        unsubscribeUrl: setting.unsubscribeUrl,
      }));
    }

    const unsubscribed = allSubscriptions
      .filter((subscription) => subscription.deletedAt !== null)
      .map((subscription) => subscription.userId);

    // Don't send notifications to users who have unsubscribed before,
    // event if they appear in `NotificationSettings`.
    //
    // NOTE: This will need to be deduped if events overlap.
    const recipients = [
      ...subscriptionRecipients,
      ...notificationRecipients,
    ].filter((recipient) => !unsubscribed.includes(recipient.user.id));

    return recipients;
  };

  private notificationEventName = (eventName: string): string => {
    return eventName === "documents.publish" ? "published" : "updated";
  };

  private shouldNotify = async (
    event: DocumentActionEvent | RevisionEvent,
    user: User,
    document: Document
  ): Promise<boolean> => {
    // Suppress notifications for suspended recipients
    if (user.isSuspended) {
      return false;
    }

    // Check the recipient has access to the collection this document is in. Just
    // because they were a collaborator once doesn't mean they still are.
    const collectionIds = await user.collectionIds();

    if (!collectionIds.includes(document.collectionId)) {
      return false;
    }

    // If this recipient has viewed the document since the last update was made
    // then we can avoid sending them a useless notification, yay.
    const view = await View.findOne({
      where: {
        userId: user.id,
        documentId: event.documentId,
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

    if (!user.email) {
      return false;
    }

    return true;
  };
}
