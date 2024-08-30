import { NotificationEventType } from "@shared/types";
import {
  buildCollection,
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
  });
});
