import { CommentMark, ProsemirrorHelper } from "./ProsemirrorHelper";

describe("ProsemirrorHelper", () => {
  describe("getAnchorTextForComment", () => {
    it("should return the anchor text for the comment", async () => {
      const commentId = "test-comment-id";
      const anchorText = "anchor text";
      const commentMarks: CommentMark[] = [
        {
          id: commentId,
          userId: "test-user-id",
          text: anchorText,
        },
        {
          id: "random-comment-id",
          userId: "test-user-id",
          text: "some random text",
        },
      ];

      const returnedAnchorText = ProsemirrorHelper.getAnchorTextForComment(
        commentMarks,
        commentId
      );

      expect(returnedAnchorText).toEqual(anchorText);
    });

    it("should return the consolidated anchor text when multiple marks are present for the comment", async () => {
      const commentId = "test-comment-id";
      const anchorTextOne = "anchor text 1";
      const anchorTextTwo = "anchor text 2";
      const commentMarks: CommentMark[] = [
        {
          id: commentId,
          userId: "test-user-id",
          text: anchorTextOne,
        },
        {
          id: commentId,
          userId: "test-user-id",
          text: anchorTextTwo,
        },
        {
          id: "random-comment-id",
          userId: "test-user-id",
          text: "some random text",
        },
      ];

      const returnedAnchorText = ProsemirrorHelper.getAnchorTextForComment(
        commentMarks,
        commentId
      );

      expect(returnedAnchorText).toEqual(`${anchorTextOne}${anchorTextTwo}`);
    });

    it("should return undefined when no comment mark matches the provided comment", async () => {
      const commentId = "test-comment-id";
      const commentMarks: CommentMark[] = [
        {
          id: "random-comment-id-1",
          userId: "test-user-id",
          text: "some random text",
        },
        {
          id: "random-comment-id-2",
          userId: "test-user-id",
          text: "some random text",
        },
      ];

      const returnedAnchorText = ProsemirrorHelper.getAnchorTextForComment(
        commentMarks,
        commentId
      );

      expect(returnedAnchorText).toBeUndefined();
    });

    it("should return undefined when comment marks are empty", async () => {
      const returnedAnchorText = ProsemirrorHelper.getAnchorTextForComment(
        [],
        "test-comment-id"
      );
      expect(returnedAnchorText).toBeUndefined();
    });
  });
});
