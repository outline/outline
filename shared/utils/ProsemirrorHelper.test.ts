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

  describe("removeMarks", () => {
    it("should remove specified mark types from text nodes", () => {
      const doc: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "hello",
                marks: [
                  { type: "comment", attrs: { id: "c1" } },
                  { type: "bold" },
                ],
              },
            ],
          },
        ],
      };

      const result = ProsemirrorHelper.removeMarks(doc, ["comment"]);
      expect(result.content![0].content![0].marks).toEqual([{ type: "bold" }]);
    });

    it("should remove marks from nested content", () => {
      const doc: ProsemirrorData = {
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
                    text: "nested",
                    marks: [{ type: "comment", attrs: { id: "c1" } }],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = ProsemirrorHelper.removeMarks(doc, ["comment"]);
      expect(result.content![0].content![0].content![0].marks).toEqual([]);
    });

    it("should remove marks from node attrs.marks", () => {
      const doc: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: {
              src: "test.png",
              marks: [
                { type: "comment", attrs: { id: "c1" } },
                { type: "link", attrs: { href: "url" } },
              ],
            },
          },
        ],
      };

      const result = ProsemirrorHelper.removeMarks(doc, ["comment"]);
      expect(result.content![0].attrs!.marks).toEqual([
        { type: "link", attrs: { href: "url" } },
      ]);
    });

    it("should remove multiple mark types at once", () => {
      const doc: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "hello",
                marks: [
                  { type: "comment", attrs: { id: "c1" } },
                  { type: "bold" },
                  { type: "highlight" },
                ],
              },
            ],
          },
        ],
      };

      const result = ProsemirrorHelper.removeMarks(doc, [
        "comment",
        "highlight",
      ]);
      expect(result.content![0].content![0].marks).toEqual([{ type: "bold" }]);
    });

    it("should leave nodes unchanged when no marks match", () => {
      const doc: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "hello",
                marks: [{ type: "bold" }],
              },
            ],
          },
        ],
      };

      const result = ProsemirrorHelper.removeMarks(doc, ["comment"]);
      expect(result.content![0].content![0].marks).toEqual([{ type: "bold" }]);
    });

    it("should handle nodes with no marks", () => {
      const doc: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "plain",
              },
            ],
          },
        ],
      };

      const result = ProsemirrorHelper.removeMarks(doc, ["comment"]);
      expect(result.content![0].content![0].marks).toBeUndefined();
    });
  });
});
