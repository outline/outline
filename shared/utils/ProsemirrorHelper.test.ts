import type { ProsemirrorData } from "../types";
import type { CommentMark } from "./ProsemirrorHelper";
import { ProsemirrorHelper } from "./ProsemirrorHelper";

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

  describe("addCommentMark", () => {
    it("should add a comment mark to matching text", () => {
      const data = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Hello world, this is a test",
              },
            ],
          },
        ],
      } as ProsemirrorData;

      const result = ProsemirrorHelper.addCommentMark(
        data,
        "world",
        "comment-1",
        "user-1"
      );

      expect(result).toBeDefined();
      expect(result!.content![0].content).toHaveLength(3);
      expect(result!.content![0].content![0]).toEqual({
        type: "text",
        text: "Hello ",
      });
      expect(result!.content![0].content![1]).toEqual({
        type: "text",
        text: "world",
        marks: [
          {
            type: "comment",
            attrs: {
              id: "comment-1",
              userId: "user-1",
              resolved: false,
              draft: false,
            },
          },
        ],
      });
      expect(result!.content![0].content![2]).toEqual({
        type: "text",
        text: ", this is a test",
      });
    });

    it("should return undefined when text is not found", () => {
      const data = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Hello world",
              },
            ],
          },
        ],
      } as ProsemirrorData;

      const result = ProsemirrorHelper.addCommentMark(
        data,
        "missing",
        "comment-1",
        "user-1"
      );

      expect(result).toBeUndefined();
    });

    it("should preserve existing marks on the text node", () => {
      const existingMark = { type: "bold" };
      const data = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "bold text here",
                marks: [existingMark],
              },
            ],
          },
        ],
      } as ProsemirrorData;

      const result = ProsemirrorHelper.addCommentMark(
        data,
        "bold text here",
        "comment-1",
        "user-1"
      );

      expect(result).toBeDefined();
      expect(result!.content![0].content).toHaveLength(1);
      expect(result!.content![0].content![0].marks).toHaveLength(2);
      expect(result!.content![0].content![0].marks![0]).toEqual(existingMark);
      expect(result!.content![0].content![0].marks![1].type).toEqual("comment");
    });

    it("should only mark the first occurrence", () => {
      const data = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "hello hello hello",
              },
            ],
          },
        ],
      } as ProsemirrorData;

      const result = ProsemirrorHelper.addCommentMark(
        data,
        "hello",
        "comment-1",
        "user-1"
      );

      expect(result).toBeDefined();
      // First "hello" gets the mark, rest stays as-is
      expect(result!.content![0].content).toHaveLength(2);
      expect(result!.content![0].content![0].text).toEqual("hello");
      expect(result!.content![0].content![0].marks).toHaveLength(1);
      expect(result!.content![0].content![1].text).toEqual(" hello hello");
    });
  });
});
