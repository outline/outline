import { NotificationEventType, SubscriptionType } from "@shared/types";
import {
  buildDocument,
  buildSubscription,
  buildUser,
} from "@server/test/factories";
import NotificationHelper from "./NotificationHelper";

describe("NotificationHelper", () => {
  describe("getDocumentNotificationRecipients", () => {
    it("should return all users who have notification enabled for the event when subscription type is not provided", async () => {
      const documentAuthor = await buildUser();
      const document = await buildDocument({
        userId: documentAuthor.id,
        teamId: documentAuthor.teamId,
      });
      const notificationEnabledUser = await buildUser({
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.UpdateDocument]: true },
      });

      const recipients =
        await NotificationHelper.getDocumentNotificationRecipients({
          document,
          notificationType: NotificationEventType.UpdateDocument,
          actorId: documentAuthor.id,
        });

      expect(recipients.length).toEqual(1);
      expect(recipients[0].id).toEqual(notificationEnabledUser.id);
    });

    it("should return users who have subscribed to the document", async () => {
      const documentAuthor = await buildUser();
      const document = await buildDocument({
        userId: documentAuthor.id,
        teamId: documentAuthor.teamId,
      });
      const subscribedUser = await buildUser({ teamId: document.teamId });
      await buildSubscription({
        userId: subscribedUser.id,
        documentId: document.id,
      });

      const recipients =
        await NotificationHelper.getDocumentNotificationRecipients({
          document,
          notificationType: NotificationEventType.UpdateDocument,
          subscriptionTypes: [SubscriptionType.Document],
          actorId: documentAuthor.id,
        });

      expect(recipients.length).toEqual(1);
      expect(recipients[0].id).toEqual(subscribedUser.id);
    });

    it("should return users who have subscribed to the collection", async () => {
      const documentAuthor = await buildUser();
      const document = await buildDocument({
        userId: documentAuthor.id,
        teamId: documentAuthor.teamId,
      });
      const subscribedUser = await buildUser({ teamId: document.teamId });
      await buildSubscription({
        userId: subscribedUser.id,
        collectionId: document.collectionId!,
      });

      const recipients =
        await NotificationHelper.getDocumentNotificationRecipients({
          document,
          notificationType: NotificationEventType.UpdateDocument,
          subscriptionTypes: [SubscriptionType.Collection],
          actorId: documentAuthor.id,
        });

      expect(recipients.length).toEqual(1);
      expect(recipients[0].id).toEqual(subscribedUser.id);
    });

    it("should return users who have subscribed to either the document or the containing collection", async () => {
      const documentAuthor = await buildUser();
      const document = await buildDocument({
        userId: documentAuthor.id,
        teamId: documentAuthor.teamId,
      });
      const [documentSubscribedUser, collectionSubscribedUser] =
        await Promise.all([
          buildUser({
            teamId: document.teamId,
          }),
          buildUser({
            teamId: document.teamId,
          }),
        ]);
      await Promise.all([
        buildSubscription({
          userId: documentSubscribedUser.id,
          documentId: document.id,
        }),
        buildSubscription({
          userId: collectionSubscribedUser.id,
          collectionId: document.collectionId!,
        }),
      ]);

      const recipients =
        await NotificationHelper.getDocumentNotificationRecipients({
          document,
          notificationType: NotificationEventType.UpdateDocument,
          subscriptionTypes: [
            SubscriptionType.Collection,
            SubscriptionType.Document,
          ],
          actorId: documentAuthor.id,
        });

      expect(recipients.length).toEqual(2);

      const recipientIds = recipients.map((u) => u.id);
      expect(recipientIds).toContain(collectionSubscribedUser.id);
      expect(recipientIds).toContain(documentSubscribedUser.id);
    });

    it("should return no users when the user is subscribed to the document, but the requested subscription is for the containing collection", async () => {
      const documentAuthor = await buildUser();
      const document = await buildDocument({
        userId: documentAuthor.id,
        teamId: documentAuthor.teamId,
      });
      const subscribedUser = await buildUser({ teamId: document.teamId });
      await buildSubscription({
        userId: subscribedUser.id,
        documentId: document.id,
      });

      const recipients =
        await NotificationHelper.getDocumentNotificationRecipients({
          document,
          notificationType: NotificationEventType.UpdateDocument,
          subscriptionTypes: [SubscriptionType.Collection],
          actorId: documentAuthor.id,
        });

      expect(recipients.length).toEqual(0);
    });

    it("should return no users when the user is subscribed to the containing collection, but the requested subscription is for the document", async () => {
      const documentAuthor = await buildUser();
      const document = await buildDocument({
        userId: documentAuthor.id,
        teamId: documentAuthor.teamId,
      });
      const subscribedUser = await buildUser({ teamId: document.teamId });
      await buildSubscription({
        userId: subscribedUser.id,
        collectionId: document.collectionId!,
      });

      const recipients =
        await NotificationHelper.getDocumentNotificationRecipients({
          document,
          notificationType: NotificationEventType.UpdateDocument,
          subscriptionTypes: [SubscriptionType.Document],
          actorId: documentAuthor.id,
        });

      expect(recipients.length).toEqual(0);
    });

    it("should not return suspended users", async () => {
      const documentAuthor = await buildUser();
      const document = await buildDocument({
        userId: documentAuthor.id,
        teamId: documentAuthor.teamId,
      });
      const notificationEnabledUser = await buildUser({
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.UpdateDocument]: true },
      });
      // suspended user
      await buildUser({
        suspendedAt: new Date(),
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.UpdateDocument]: true },
      });

      const recipients =
        await NotificationHelper.getDocumentNotificationRecipients({
          document,
          notificationType: NotificationEventType.UpdateDocument,
          actorId: documentAuthor.id,
        });

      expect(recipients.length).toEqual(1);
      expect(recipients[0].id).toEqual(notificationEnabledUser.id);
    });
  });
});
