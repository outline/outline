import { ProsemirrorData } from "../types";
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

  describe("getPlainParagraphs", () => {
    it("should return an array of plain paragraphs", async () => {
      const data = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "some content in a paragraph",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "some content in another paragraph",
              },
            ],
          },
        ],
      } as ProsemirrorData;

      const paragraphs = ProsemirrorHelper.getPlainParagraphs(data);

      expect(paragraphs).toEqual([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "some content in a paragraph",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "some content in another paragraph",
            },
          ],
        },
      ]);
    });

    it("should return undefined when data contains inline nodes", async () => {
      const data = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "some content in a paragraph",
              },
              {
                type: "emoji",
                attrs: {
                  "data-name": "😆",
                },
              },
            ],
          },
        ],
      } as ProsemirrorData;

      const paragraphs = ProsemirrorHelper.getPlainParagraphs(data);
      expect(paragraphs).toBeUndefined();
    });

    it("should return undefined when data contains block nodes", async () => {
      const data = {
        type: "doc",
        content: [
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: "some content in a paragraph",
                  },
                ],
              },
            ],
          },
        ],
      } as ProsemirrorData;

      const paragraphs = ProsemirrorHelper.getPlainParagraphs(data);
      expect(paragraphs).toBeUndefined();
    });

    it("should return undefined when data contains marks", async () => {
      const data = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "some content in a paragraph",
                marks: [
                  {
                    type: "bold",
                  },
                ],
              },
            ],
          },
        ],
      } as ProsemirrorData;

      const paragraphs = ProsemirrorHelper.getPlainParagraphs(data);
      expect(paragraphs).toBeUndefined();
    });

    it("should handle paragraph without content", async () => {
      const data = {
        type: "doc",
        content: [
          {
            type: "paragraph",
          },
        ],
      } as ProsemirrorData;

      const paragraphs = ProsemirrorHelper.getPlainParagraphs(data);
      expect(paragraphs).toEqual([
        {
          type: "paragraph",
        },
      ]);
    });
  });
});
