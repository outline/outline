import {
  buildComment,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import Comment from "./Comment";

describe("Comment", () => {
  describe("updateReactions", () => {
    it("should add a reaction", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const document = await buildDocument({
        userId: user.id,
        teamId: team.id,
      });
      const comment = await buildComment({
        userId: user.id,
        documentId: document.id,
      });

      await comment.updateReactions({
        type: "add",
        emoji: "😄",
        userId: user.id,
      });

      const updatedComment = await Comment.findByPk(comment.id);
      const reactions = updatedComment?.reactions;
      expect(reactions?.length).toEqual(1);
      expect(reactions?.at(0)?.emoji).toBe("😄");
      expect(reactions?.at(0)?.userIds).toContain(user.id);
    });

    it("should add a reaction to a comment with an existing reaction", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const document = await buildDocument({
        userId: user.id,
        teamId: team.id,
      });
      const comment = await buildComment({
        userId: user.id,
        documentId: document.id,
        reactions: [{ emoji: "🧐", userIds: [user.id] }],
      });

      await comment.updateReactions({
        type: "add",
        emoji: "😄",
        userId: user.id,
      });

      const updatedComment = await Comment.findByPk(comment.id);
      const reactions = updatedComment?.reactions;
      expect(reactions?.length).toEqual(2);
      expect(reactions?.map((r) => r.emoji)).toEqual(["🧐", "😄"]);
      expect(reactions?.at(0)?.userIds).toContain(user.id);
    });

    it("should remove a reaction", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const document = await buildDocument({
        userId: user.id,
        teamId: team.id,
      });
      const comment = await buildComment({
        userId: user.id,
        documentId: document.id,
        reactions: [{ emoji: "😄", userIds: [user.id] }],
      });

      await comment.updateReactions({
        type: "remove",
        emoji: "😄",
        userId: user.id,
      });

      const updatedComment = await Comment.findByPk(comment.id);
      const reactions = updatedComment?.reactions;
      expect(reactions?.length).toEqual(0);
    });

    it("should remove a reaction from a comment with an existing reaction", async () => {
      const team = await buildTeam();
      const user = await buildUser({ teamId: team.id });
      const document = await buildDocument({
        userId: user.id,
        teamId: team.id,
      });
      const comment = await buildComment({
        userId: user.id,
        documentId: document.id,
        reactions: [
          { emoji: "🧐", userIds: [user.id] },
          { emoji: "😄", userIds: [user.id] },
        ],
      });

      await comment.updateReactions({
        type: "remove",
        emoji: "😄",
        userId: user.id,
      });

      const updatedComment = await Comment.findByPk(comment.id);
      const reactions = updatedComment?.reactions;
      expect(reactions?.length).toEqual(1);
      expect(reactions?.at(0)?.emoji).toContain("🧐");
      expect(reactions?.at(0)?.userIds).toContain(user.id);
    });
  });
});
