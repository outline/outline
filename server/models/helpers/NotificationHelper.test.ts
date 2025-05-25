import { DocumentPermission, NotificationEventType } from "@shared/types";
import { UserMembership } from "@server/models";
import {
  buildComment,
  buildDocument,
  buildDraftDocument,
  buildSubscription,
  buildUser,
} from "@server/test/factories";
import NotificationHelper from "./NotificationHelper";

describe("NotificationHelper", () => {
  describe("getCommentNotificationRecipients", () => {
    it("should only return users who have notification enabled for comment creation and are subscribed to the document in case of new thread", async () => {
      const documentAuthor = await buildUser();
      const document = await buildDocument({
        userId: documentAuthor.id,
        teamId: documentAuthor.teamId,
      });
      const notificationEnabledUser = await buildUser({
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.CreateComment]: true },
      });
      const notificationDisabledUser = await buildUser({
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.CreateComment]: false },
      });
      await Promise.all([
        buildSubscription({
          userId: documentAuthor.id,
          documentId: document.id,
        }),
        buildSubscription({
          userId: notificationEnabledUser.id,
          documentId: document.id,
        }),
        buildSubscription({
          userId: notificationDisabledUser.id,
          documentId: document.id,
        }),
      ]);

      const comment = await buildComment({
        documentId: document.id,
        userId: documentAuthor.id,
      });

      const recipients =
        await NotificationHelper.getCommentNotificationRecipients(
          document,
          comment,
          comment.createdById
        );

      expect(recipients.length).toEqual(1);
      expect(recipients[0].id).toEqual(notificationEnabledUser.id);
    });

    it("should only return users who have notification enabled for comment creation and are subscribed to the document in case of new thread in draft", async () => {
      const documentAuthor = await buildUser();

      // create a draft
      const document = await buildDraftDocument({
        userId: documentAuthor.id,
        teamId: documentAuthor.teamId,
        collectionId: null,
      });

      // add a bunch of users as direct members
      const user = await buildUser({
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.CreateComment]: true },
      });
      const user2 = await buildUser({
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.CreateComment]: true },
      });
      const user3 = await buildUser({
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.CreateComment]: true },
      });
      await UserMembership.create({
        documentId: document.id,
        userId: user.id,
        permission: DocumentPermission.Read,
        createdById: user.id,
      });
      await UserMembership.create({
        documentId: document.id,
        userId: user2.id,
        permission: DocumentPermission.Read,
        createdById: user.id,
      });
      await UserMembership.create({
        documentId: document.id,
        userId: user3.id,
        permission: DocumentPermission.Read,
        createdById: user.id,
      });

      // Add a subscription for only one of those users
      await Promise.all([
        buildSubscription({
          userId: user.id,
        }),
        buildSubscription({
          userId: user2.id,
        }),
        buildSubscription({
          userId: user3.id,
          documentId: document.id,
        }),
      ]);

      const comment = await buildComment({
        documentId: document.id,
        userId: documentAuthor.id,
      });

      const recipients =
        await NotificationHelper.getCommentNotificationRecipients(
          document,
          comment,
          comment.createdById
        );

      expect(recipients.length).toEqual(1);
      expect(recipients[0].id).toEqual(user3.id);
    });

    it("should only return users who have notification enabled for comment creation and are in the thread in case of child comment", async () => {
      const documentAuthor = await buildUser();
      const document = await buildDocument({
        userId: documentAuthor.id,
        teamId: documentAuthor.teamId,
      });
      const notificationEnabledUserInThread = await buildUser({
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.CreateComment]: true },
      });
      const notificationEnabledUserNotInThread = await buildUser({
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.CreateComment]: true },
      });
      const notificationDisabledUser = await buildUser({
        teamId: document.teamId,
        notificationSettings: {
          [NotificationEventType.CreateComment]: false,
        },
      });
      await Promise.all([
        buildSubscription({
          userId: documentAuthor.id,
          documentId: document.id,
        }),
        buildSubscription({
          userId: notificationEnabledUserInThread.id,
          documentId: document.id,
        }),
        buildSubscription({
          userId: notificationEnabledUserNotInThread.id,
          documentId: document.id,
        }),
        buildSubscription({
          userId: notificationDisabledUser.id,
          documentId: document.id,
        }),
      ]);
      const parentComment = await buildComment({
        documentId: document.id,
        userId: notificationEnabledUserInThread.id,
      });
      const childComment = await buildComment({
        documentId: document.id,
        userId: documentAuthor.id,
        parentCommentId: parentComment.id,
      });

      const recipients =
        await NotificationHelper.getCommentNotificationRecipients(
          document,
          childComment,
          childComment.createdById
        );

      expect(recipients.length).toEqual(1);
      expect(recipients[0].id).toEqual(notificationEnabledUserInThread.id);
    });

    it("should not return users who have notification disabled for comment creation and are in the thread in case of child comment", async () => {
      const documentAuthor = await buildUser();
      const document = await buildDocument({
        userId: documentAuthor.id,
        teamId: documentAuthor.teamId,
      });
      const notificationEnabledUserInThread = await buildUser({
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.CreateComment]: false },
      });
      const notificationEnabledUserNotInThread = await buildUser({
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.CreateComment]: true },
      });
      const notificationDisabledUser = await buildUser({
        teamId: document.teamId,
        notificationSettings: {
          [NotificationEventType.CreateComment]: false,
        },
      });
      await Promise.all([
        buildSubscription({
          userId: documentAuthor.id,
          documentId: document.id,
        }),
        buildSubscription({
          userId: notificationEnabledUserInThread.id,
          documentId: document.id,
        }),
        buildSubscription({
          userId: notificationEnabledUserNotInThread.id,
          documentId: document.id,
        }),
        buildSubscription({
          userId: notificationDisabledUser.id,
          documentId: document.id,
        }),
      ]);
      const parentComment = await buildComment({
        documentId: document.id,
        userId: notificationEnabledUserInThread.id,
      });
      const childComment = await buildComment({
        documentId: document.id,
        userId: documentAuthor.id,
        parentCommentId: parentComment.id,
      });

      const recipients =
        await NotificationHelper.getCommentNotificationRecipients(
          document,
          childComment,
          childComment.createdById
        );

      expect(recipients.length).toEqual(0);
    });

    it("should return users who have notification enabled and are in the thread but not explicitly subscribed to document", async () => {
      const documentAuthor = await buildUser();
      const document = await buildDocument({
        userId: documentAuthor.id,
        teamId: documentAuthor.teamId,
      });
      const notificationEnabledUserInThread = await buildUser({
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.CreateComment]: true },
      });
      await buildUser({
        teamId: document.teamId,
        notificationSettings: {
          [NotificationEventType.CreateComment]: false,
        },
      });
      const parentComment = await buildComment({
        documentId: document.id,
        userId: notificationEnabledUserInThread.id,
      });
      const childComment = await buildComment({
        documentId: document.id,
        userId: documentAuthor.id,
        parentCommentId: parentComment.id,
      });

      const recipients =
        await NotificationHelper.getCommentNotificationRecipients(
          document,
          childComment,
          childComment.createdById
        );

      expect(recipients.length).toEqual(1);
      expect(recipients[0].id).toEqual(notificationEnabledUserInThread.id);
    });
  });

  describe("getDocumentNotificationRecipients", () => {
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

      const deletedUser = await buildUser({ teamId: document.teamId });
      await buildSubscription({
        userId: deletedUser.id,
        documentId: document.id,
      });
      await deletedUser.destroy();

      const recipients =
        await NotificationHelper.getDocumentNotificationRecipients({
          document,
          notificationType: NotificationEventType.UpdateDocument,
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
      await buildSubscription({
        userId: subscribedUser.id,
        documentId: document.id,
      });

      const recipients =
        await NotificationHelper.getDocumentNotificationRecipients({
          document,
          notificationType: NotificationEventType.UpdateDocument,
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
          actorId: documentAuthor.id,
        });

      expect(recipients.length).toEqual(2);

      const recipientIds = recipients.map((u) => u.id);
      expect(recipientIds).toContain(collectionSubscribedUser.id);
      expect(recipientIds).toContain(documentSubscribedUser.id);
    });

    it("should not return suspended users", async () => {
      const documentAuthor = await buildUser();
      const document = await buildDocument({
        userId: documentAuthor.id,
        teamId: documentAuthor.teamId,
      });
      const notificationEnabledUser = await buildUser({
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.PublishDocument]: true },
      });
      // suspended user
      await buildUser({
        suspendedAt: new Date(),
        teamId: document.teamId,
        notificationSettings: { [NotificationEventType.PublishDocument]: true },
      });

      const recipients =
        await NotificationHelper.getDocumentNotificationRecipients({
          document,
          notificationType: NotificationEventType.PublishDocument,
          actorId: documentAuthor.id,
        });

      expect(recipients.length).toEqual(1);
      expect(recipients[0].id).toEqual(notificationEnabledUser.id);
    });
  });
});
