import { NotificationEventType } from "@shared/types";
import {
  buildCollection,
  buildComment,
  buildDocument,
  buildNotification,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import {
  getEmailMessageId,
  MaxMessagesInEmailThread,
} from "@server/utils/emails";
import Notification from "./Notification";

describe("Notification", () => {
  describe("emailReferences", () => {
    it("should return no references for an unsupported notification", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        userId: user.id,
        teamId: team.id,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        userId: user.id,
        teamId: team.id,
      });

      const notification = await buildNotification({
        event: NotificationEventType.AddUserToDocument,
        documentId: document.id,
        userId: user.id,
        teamId: team.id,
      });
      const references = await Notification.emailReferences(notification);

      expect(references).toBeUndefined();
    });

    it("should return no references for a new notification", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const collection = await buildCollection({
        userId: user.id,
        teamId: team.id,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        userId: user.id,
        teamId: team.id,
      });

      const notification = await buildNotification({
        event: NotificationEventType.UpdateDocument,
        documentId: document.id,
        userId: user.id,
        teamId: team.id,
      });
      const references = await Notification.emailReferences(notification);

      expect(references).toBeUndefined();
    });

    describe("should return references from last thread for current notification", () => {
      it("only one thread available", async () => {
        const team = await buildTeam();
        const user = await buildUser({ teamId: team.id });
        const collection = await buildCollection({
          userId: user.id,
          teamId: team.id,
        });
        const document = await buildDocument({
          collectionId: collection.id,
          userId: user.id,
          teamId: team.id,
        });
        const pastNotifications = await Notification.bulkCreate(
          [...Array(2)].map(() => ({
            event: NotificationEventType.UpdateDocument,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          }))
        );

        const notification = await buildNotification({
          event: NotificationEventType.UpdateDocument,
          documentId: document.id,
          userId: user.id,
          teamId: team.id,
        });
        const references = await Notification.emailReferences(notification);

        expect(references?.length).toEqual(2);

        const expectedReferences = pastNotifications.map((notif) =>
          getEmailMessageId(notif.id)
        );

        expect(references).toEqual(expectedReferences);
      });

      it("multiple threads available", async () => {
        const team = await buildTeam();
        const user = await buildUser({ teamId: team.id });
        const collection = await buildCollection({
          userId: user.id,
          teamId: team.id,
        });
        const document = await buildDocument({
          collectionId: collection.id,
          userId: user.id,
          teamId: team.id,
        });
        const pastNotifications = await Notification.bulkCreate(
          [...Array(105)].map(() => ({
            event: NotificationEventType.UpdateDocument,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          }))
        );

        const notification = await buildNotification({
          event: NotificationEventType.UpdateDocument,
          documentId: document.id,
          userId: user.id,
          teamId: team.id,
        });
        const references = await Notification.emailReferences(notification);

        expect(references?.length).toEqual(5);

        const expectedReferences = pastNotifications
          .slice(MaxMessagesInEmailThread)
          .map((notif) => getEmailMessageId(notif.id));

        expect(references).toEqual(expectedReferences);
      });
    });

    describe("should return references from consolidated events", () => {
      it("document edits", async () => {
        const team = await buildTeam();
        const user = await buildUser({ teamId: team.id });
        const collection = await buildCollection({
          userId: user.id,
          teamId: team.id,
        });
        const document = await buildDocument({
          collectionId: collection.id,
          userId: user.id,
          teamId: team.id,
        });
        const pastNotifications = await Notification.bulkCreate([
          {
            event: NotificationEventType.PublishDocument,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          },
          ...[...Array(2)].map(() => ({
            event: NotificationEventType.UpdateDocument,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          })),
          ...[...Array(2)].map(() => ({
            event: NotificationEventType.CreateComment,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          })),
        ]);

        const notification = await buildNotification({
          event: NotificationEventType.UpdateDocument,
          documentId: document.id,
          userId: user.id,
          teamId: team.id,
        });
        const references = await Notification.emailReferences(notification);

        expect(references?.length).toEqual(3);

        const expectedReferences = pastNotifications
          .filter(
            (notif) =>
              notif.event === NotificationEventType.PublishDocument ||
              notif.event === NotificationEventType.UpdateDocument
          )
          .map((notif) => getEmailMessageId(notif.id));

        expect(references).toEqual(expectedReferences);
      });

      it("comment creation", async () => {
        const team = await buildTeam();
        const user = await buildUser({ teamId: team.id });
        const collection = await buildCollection({
          userId: user.id,
          teamId: team.id,
        });
        const document = await buildDocument({
          collectionId: collection.id,
          userId: user.id,
          teamId: team.id,
        });
        const pastNotifications = await Notification.bulkCreate([
          {
            event: NotificationEventType.PublishDocument,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          },
          ...[...Array(2)].map(() => ({
            event: NotificationEventType.UpdateDocument,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          })),
          ...[...Array(2)].map(() => ({
            event: NotificationEventType.CreateComment,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          })),
        ]);

        const notification = await buildNotification({
          event: NotificationEventType.CreateComment,
          documentId: document.id,
          userId: user.id,
          teamId: team.id,
        });
        const references = await Notification.emailReferences(notification);

        expect(references?.length).toEqual(2);

        const expectedReferences = pastNotifications
          .filter(
            (notif) => notif.event === NotificationEventType.CreateComment
          )
          .map((notif) => getEmailMessageId(notif.id));

        expect(references).toEqual(expectedReferences);
      });

      it("document mentions", async () => {
        const team = await buildTeam();
        const user = await buildUser({ teamId: team.id });
        const collection = await buildCollection({
          userId: user.id,
          teamId: team.id,
        });
        const document = await buildDocument({
          collectionId: collection.id,
          userId: user.id,
          teamId: team.id,
        });
        const comment = await buildComment({
          documentId: document.id,
          userId: user.id,
        });
        const pastNotifications = await Notification.bulkCreate([
          {
            event: NotificationEventType.PublishDocument,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          },
          {
            event: NotificationEventType.UpdateDocument,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          },
          {
            event: NotificationEventType.CreateComment,
            commentId: comment.id,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          },
          {
            event: NotificationEventType.MentionedInComment,
            commentId: comment.id,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          },
          {
            event: NotificationEventType.MentionedInDocument,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          },
        ]);

        const notification = await buildNotification({
          event: NotificationEventType.MentionedInDocument,
          documentId: document.id,
          userId: user.id,
          teamId: team.id,
        });

        const references = await Notification.emailReferences(notification);

        expect(references?.length).toEqual(2);

        const expectedReferences = pastNotifications
          .filter(
            (notif) =>
              notif.event === NotificationEventType.MentionedInDocument ||
              notif.event === NotificationEventType.MentionedInComment
          )
          .map((notif) => getEmailMessageId(notif.id));

        expect(references).toEqual(expectedReferences);
      });

      it("comment mentions", async () => {
        const team = await buildTeam();
        const user = await buildUser({ teamId: team.id });
        const collection = await buildCollection({
          userId: user.id,
          teamId: team.id,
        });
        const document = await buildDocument({
          collectionId: collection.id,
          userId: user.id,
          teamId: team.id,
        });
        const comment = await buildComment({
          documentId: document.id,
          userId: user.id,
        });
        const pastNotifications = await Notification.bulkCreate([
          {
            event: NotificationEventType.PublishDocument,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          },
          {
            event: NotificationEventType.UpdateDocument,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          },
          {
            event: NotificationEventType.CreateComment,
            commentId: comment.id,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          },
          {
            event: NotificationEventType.MentionedInComment,
            commentId: comment.id,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          },
          {
            event: NotificationEventType.MentionedInDocument,
            documentId: document.id,
            userId: user.id,
            teamId: team.id,
          },
        ]);

        const notification = await buildNotification({
          event: NotificationEventType.MentionedInComment,
          documentId: document.id,
          userId: user.id,
          teamId: team.id,
        });
        const references = await Notification.emailReferences(notification);

        expect(references?.length).toEqual(2);

        const expectedReferences = pastNotifications
          .filter(
            (notif) =>
              notif.event === NotificationEventType.MentionedInComment ||
              notif.event === NotificationEventType.MentionedInDocument
          )
          .map((notif) => getEmailMessageId(notif.id));

        expect(references).toEqual(expectedReferences);
      });
    });
  });
});
