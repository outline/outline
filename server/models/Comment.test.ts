import { v4 as uuidv4 } from "uuid";
import { MentionType } from "@shared/types";
import { buildComment, buildDocument, buildUser } from "@server/test/factories";
import Comment from "./Comment";

describe("Comment", () => {
  describe("toPlainText", () => {
    it("should convert simple text to plain text", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const comment = await buildComment({
        userId: user.id,
        documentId: document.id,
      });

      const text = comment.toPlainText();
      expect(text).toBe("test");
    });

    it("should convert comment with mention to plain text", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const comment = await Comment.create({
        documentId: document.id,
        createdById: user.id,
        data: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Hello ",
                },
                {
                  type: "mention",
                  attrs: {
                    type: MentionType.User,
                    label: "Jane",
                    modelId: uuidv4(),
                    id: uuidv4(),
                  },
                },
              ],
            },
          ],
        },
      });

      const text = comment.toPlainText();
      expect(text).toBe("Hello @Jane");
    });

    it("should convert comment with document mention to plain text", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const comment = await Comment.create({
        documentId: document.id,
        createdById: user.id,
        data: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "See ",
                },
                {
                  type: "mention",
                  attrs: {
                    type: MentionType.Document,
                    label: "My Document",
                    modelId: uuidv4(),
                    id: uuidv4(),
                  },
                },
              ],
            },
          ],
        },
      });

      const text = comment.toPlainText();
      expect(text).toBe("See My Document");
    });
  });

  describe("resolve", () => {
    it("should resolve the comment", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const comment = await buildComment({
        userId: user.id,
        documentId: document.id,
      });

      comment.resolve(user);

      expect(comment.isResolved).toBe(true);
      expect(comment.resolvedById).toBe(user.id);
      expect(comment.resolvedAt).toBeTruthy();
    });

    it("should throw if already resolved", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const comment = await buildComment({
        userId: user.id,
        documentId: document.id,
      });

      comment.resolve(user);

      expect(() => comment.resolve(user)).toThrow();
    });

    it("should throw if comment is a reply", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const parent = await buildComment({
        userId: user.id,
        documentId: document.id,
      });
      const reply = await buildComment({
        userId: user.id,
        documentId: document.id,
        parentCommentId: parent.id,
      });

      expect(() => reply.resolve(user)).toThrow();
    });
  });

  describe("unresolve", () => {
    it("should unresolve the comment", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const comment = await buildComment({
        userId: user.id,
        documentId: document.id,
      });

      comment.resolve(user);
      comment.unresolve();

      expect(comment.isResolved).toBe(false);
      expect(comment.resolvedById).toBeNull();
      expect(comment.resolvedAt).toBeNull();
    });

    it("should throw if not resolved", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const comment = await buildComment({
        userId: user.id,
        documentId: document.id,
      });

      expect(() => comment.unresolve()).toThrow();
    });
  });

  describe("cascade resolved state", () => {
    it("propagates resolvedAt to existing replies when the thread is resolved", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const thread = await buildComment({
        userId: user.id,
        documentId: document.id,
      });
      const reply = await buildComment({
        userId: user.id,
        documentId: document.id,
        parentCommentId: thread.id,
      });

      thread.resolve(user);
      await thread.save();

      await reply.reload();
      expect(reply.resolvedAt).toEqual(thread.resolvedAt);
      expect(reply.resolvedById).toEqual(user.id);
    });

    it("clears resolvedAt on replies when the thread is unresolved", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const thread = await buildComment({
        userId: user.id,
        documentId: document.id,
      });
      const reply = await buildComment({
        userId: user.id,
        documentId: document.id,
        parentCommentId: thread.id,
      });

      thread.resolve(user);
      await thread.save();
      thread.unresolve();
      await thread.save();

      await reply.reload();
      expect(reply.resolvedAt).toBeNull();
      expect(reply.resolvedById).toBeNull();
    });

    it("inherits resolved state when a reply is created on a resolved thread", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const thread = await buildComment({
        userId: user.id,
        documentId: document.id,
      });
      thread.resolve(user);
      await thread.save();

      const reply = await buildComment({
        userId: user.id,
        documentId: document.id,
        parentCommentId: thread.id,
      });

      expect(reply.resolvedAt).toEqual(thread.resolvedAt);
      expect(reply.resolvedById).toEqual(user.id);
    });

    it("rejects replies to comments in a different document", async () => {
      const user = await buildUser();
      const document = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const otherDocument = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const thread = await buildComment({
        userId: user.id,
        documentId: otherDocument.id,
      });

      await expect(
        buildComment({
          userId: user.id,
          documentId: document.id,
          parentCommentId: thread.id,
        })
      ).rejects.toThrow("Parent comment must belong to the same document");
    });
  });
});
