import { NotificationEventType } from "@shared/types";
import { buildDocument, buildNotification } from "@server/test/factories";
import Notification from "./Notification";

describe("Notification", () => {
  describe("emailReferences", () => {
    it("should return no reference for an unsupported notification", async () => {
      const notification = await buildNotification({
        event: NotificationEventType.AddUserToDocument,
      });
      const references = Notification.emailReferences(notification);
      expect(references).toBeUndefined();
    });

    describe("should return document update reference", () => {
      it("document published", async () => {
        const document = await buildDocument();
        const notification = await buildNotification({
          event: NotificationEventType.PublishDocument,
          documentId: document.id,
        });

        const references = Notification.emailReferences(notification);

        const expectedReference = Notification.emailMessageId(
          `${document.id}-updates`
        );
        expect(references![0]).toBe(expectedReference);
      });

      it("document updated", async () => {
        const document = await buildDocument();
        const notification = await buildNotification({
          event: NotificationEventType.UpdateDocument,
          documentId: document.id,
        });

        const references = Notification.emailReferences(notification);

        const expectedReference = Notification.emailMessageId(
          `${document.id}-updates`
        );
        expect(references![0]).toBe(expectedReference);
      });
    });

    describe("should return mention reference", () => {
      it("mentioned in document", async () => {
        const document = await buildDocument();
        const notification = await buildNotification({
          event: NotificationEventType.MentionedInDocument,
          documentId: document.id,
        });

        const references = Notification.emailReferences(notification);

        const expectedReference = Notification.emailMessageId(
          `${document.id}-mentions`
        );
        expect(references?.length).toBe(1);
        expect(references![0]).toBe(expectedReference);
      });

      it("mentioned in comment", async () => {
        const document = await buildDocument();
        const notification = await buildNotification({
          event: NotificationEventType.MentionedInComment,
          documentId: document.id,
        });

        const references = Notification.emailReferences(notification);

        const expectedReference = Notification.emailMessageId(
          `${document.id}-mentions`
        );
        expect(references?.length).toBe(1);
        expect(references![0]).toBe(expectedReference);
      });
    });

    it("should return comment reference", async () => {
      const document = await buildDocument();
      const notification = await buildNotification({
        event: NotificationEventType.CreateComment,
        documentId: document.id,
      });

      const references = Notification.emailReferences(notification);

      const expectedReference = Notification.emailMessageId(
        `${document.id}-comments`
      );
      expect(references?.length).toBe(1);
      expect(references![0]).toBe(expectedReference);
    });
  });
});
