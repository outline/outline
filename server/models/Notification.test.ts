import { NotificationEventType } from "@shared/types";
import {
  buildComment,
  buildDocument,
  buildNotification,
  buildUser,
} from "@server/test/factories";
import Notification from "./Notification";

describe("Notification", () => {
  describe("emailReferences", () => {
    it("should return no reference for an unsupported notification", async () => {
      const notification = await buildNotification({
        event: NotificationEventType.AddUserToDocument,
      });
      const references = await Notification.emailReferences(notification);
      expect(references).toBeUndefined();
    });

    describe("should return document update reference", () => {
      it("document published", async () => {
        const document = await buildDocument();
        const notification = await buildNotification({
          event: NotificationEventType.PublishDocument,
          documentId: document.id,
        });

        const references = await Notification.emailReferences(notification);

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

        const references = await Notification.emailReferences(notification);

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

        const references = await Notification.emailReferences(notification);

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

        const references = await Notification.emailReferences(notification);

        const expectedReference = Notification.emailMessageId(
          `${document.id}-mentions`
        );
        expect(references?.length).toBe(1);
        expect(references![0]).toBe(expectedReference);
      });
    });

    describe("should return comment reference", () => {
      it("first comment in a thread", async () => {
        const user = await buildUser();
        const document = await buildDocument({
          userId: user.id,
          teamId: user.teamId,
        });
        const comment = await buildComment({
          documentId: document.id,
          userId: user.id,
        });
        const notification = await buildNotification({
          event: NotificationEventType.CreateComment,
          commentId: comment.id,
        });

        const references = await Notification.emailReferences(notification);

        const expectedReference = Notification.emailMessageId(
          `${comment.id}-comments`
        );
        expect(references?.length).toBe(1);
        expect(references![0]).toBe(expectedReference);
      });

      it("child comments in a thread", async () => {
        const user = await buildUser();
        const document = await buildDocument({
          userId: user.id,
          teamId: user.teamId,
        });
        const parentComment = await buildComment({
          documentId: document.id,
          userId: user.id,
        });
        const childComment = await buildComment({
          documentId: document.id,
          userId: user.id,
          parentCommentId: parentComment.id,
        });
        const notification = await buildNotification({
          event: NotificationEventType.CreateComment,
          commentId: childComment.id,
        });

        const references = await Notification.emailReferences(notification);

        const expectedReference = Notification.emailMessageId(
          `${parentComment.id}-comments`
        );
        expect(references?.length).toBe(1);
        expect(references![0]).toBe(expectedReference);
      });
    });
  });
});
