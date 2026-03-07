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

  describe("addCommentMark", () => {
    it("should add a comment mark to matching text", () => {
      const doc: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hello world, this is important text here." },
            ],
          },
        ],
      };

      const result = ProsemirrorHelper.addCommentMark(
        doc,
        "comment-123",
        "important text",
        "user-456"
      );

      expect(result).not.toBeNull();
      const paragraph = result!.content![0];
      expect(paragraph.content).toHaveLength(3);
      expect(paragraph.content![0].text).toEqual("Hello world, this is ");
      expect(paragraph.content![1].text).toEqual("important text");
      expect(paragraph.content![1].marks).toEqual([
        { type: "comment", attrs: { id: "comment-123", userId: "user-456", resolved: false } },
      ]);
      expect(paragraph.content![2].text).toEqual(" here.");
    });

    it("should return null when text is not found", () => {
      const doc: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Hello world." }],
          },
        ],
      };

      const result = ProsemirrorHelper.addCommentMark(
        doc,
        "comment-123",
        "nonexistent",
        "user-456"
      );

      expect(result).toBeNull();
    });

    it("should preserve existing marks on text", () => {
      const doc: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "bold and commented",
                marks: [{ type: "bold" }],
              },
            ],
          },
        ],
      };

      const result = ProsemirrorHelper.addCommentMark(
        doc,
        "comment-123",
        "and commented",
        "user-456"
      );

      expect(result).not.toBeNull();
      const paragraph = result!.content![0];
      expect(paragraph.content).toHaveLength(2);
      expect(paragraph.content![0].text).toEqual("bold ");
      expect(paragraph.content![0].marks).toEqual([{ type: "bold" }]);
      expect(paragraph.content![1].text).toEqual("and commented");
      expect(paragraph.content![1].marks).toEqual([
        { type: "bold" },
        { type: "comment", attrs: { id: "comment-123", userId: "user-456", resolved: false } },
      ]);
    });

    it("should only mark the first occurrence", () => {
      const doc: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "hello hello hello" }],
          },
        ],
      };

      const result = ProsemirrorHelper.addCommentMark(
        doc,
        "comment-123",
        "hello",
        "user-456"
      );

      expect(result).not.toBeNull();
      const paragraph = result!.content![0];
      expect(paragraph.content).toHaveLength(2);
      expect(paragraph.content![0].text).toEqual("hello");
      expect(paragraph.content![0].marks).toBeDefined();
      expect(paragraph.content![1].text).toEqual(" hello hello");
      expect(paragraph.content![1].marks).toBeUndefined();
    });

    it("should find text in nested nodes", () => {
      const doc: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Title" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "First paragraph." }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Second paragraph with target." }],
          },
        ],
      };

      const result = ProsemirrorHelper.addCommentMark(
        doc,
        "comment-123",
        "target",
        "user-456"
      );

      expect(result).not.toBeNull();
      // First two nodes should be unchanged
      expect(result!.content![0]).toEqual(doc.content![0]);
      expect(result!.content![1]).toEqual(doc.content![1]);
      // Third node should have the mark
      const thirdParagraph = result!.content![2];
      expect(thirdParagraph.content).toHaveLength(3);
      expect(thirdParagraph.content![1].text).toEqual("target");
      expect(thirdParagraph.content![1].marks![0].type).toEqual("comment");
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
