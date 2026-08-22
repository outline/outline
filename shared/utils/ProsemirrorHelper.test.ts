import { Schema } from "prosemirror-model";
import type { ProsemirrorData } from "../types";
import type { CommentMark } from "./ProsemirrorHelper";
import { ProsemirrorHelper } from "./ProsemirrorHelper";

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 1 } },
    },
    table: { group: "block", content: "tr+" },
    tr: { content: "td+" },
    td: { content: "block+" },
    image: {
      group: "inline",
      inline: true,
      attrs: {
        src: { default: "" },
        alt: { default: null },
        marks: { default: undefined },
      },
    },
    text: { group: "inline" },
  },
});

const doc = (...children: object[]) =>
  schema.nodeFromJSON({ type: "doc", content: children });

const paragraph = (...content: object[]) => ({
  type: "paragraph",
  content,
});

const image = (attrs: object) => ({ type: "image", attrs });

const heading = (title: string, level: number) => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text: title }],
});

const table = (...content: object[]) => ({
  type: "table",
  content: [{ type: "tr", content: [{ type: "td", content }] }],
});

describe("ProsemirrorHelper", () => {
  describe("getNodeHash", () => {
    it("returns the same hash regardless of attribute order", () => {
      const a = schema.nodeFromJSON(image({ src: "a.png", alt: "label" }));
      const b = schema.nodeFromJSON(image({ alt: "label", src: "a.png" }));

      expect(ProsemirrorHelper.getNodeHash(a)).toEqual(
        ProsemirrorHelper.getNodeHash(b)
      );
    });

    it("excludes the marks attribute from the hash", () => {
      const plain = schema.nodeFromJSON(image({ src: "a.png" }));
      const marked = schema.nodeFromJSON(
        image({
          src: "a.png",
          marks: [{ type: "comment", attrs: { id: "comment-1" } }],
        })
      );

      expect(ProsemirrorHelper.getNodeHash(plain)).toEqual(
        ProsemirrorHelper.getNodeHash(marked)
      );
    });

    it("returns different hashes for different attributes", () => {
      const a = schema.nodeFromJSON(image({ src: "a.png" }));
      const b = schema.nodeFromJSON(image({ src: "b.png" }));

      expect(ProsemirrorHelper.getNodeHash(a)).not.toEqual(
        ProsemirrorHelper.getNodeHash(b)
      );
    });
  });

  describe("findNodeByHash", () => {
    it("finds a node by its hash", () => {
      const document = doc(
        paragraph({ type: "text", text: "hello" }),
        paragraph(image({ src: "a.png" }))
      );
      const hash = ProsemirrorHelper.getNodeHash(
        schema.nodeFromJSON(image({ src: "a.png" }))
      );

      const match = ProsemirrorHelper.findNodeByHash(document, hash);
      expect(match?.node.attrs.src).toEqual("a.png");
    });

    it("returns the first occurrence in document order for identical nodes", () => {
      const document = doc(
        paragraph({ type: "text", text: "hello" }),
        paragraph(image({ src: "a.png" })),
        paragraph(image({ src: "a.png" }))
      );
      const hash = ProsemirrorHelper.getNodeHash(
        schema.nodeFromJSON(image({ src: "a.png" }))
      );

      const match = ProsemirrorHelper.findNodeByHash(document, hash);
      expect(match?.node.type.name).toEqual("image");
      expect(match?.pos).toEqual(8);
    });

    it("returns null when no node matches", () => {
      const document = doc(paragraph(image({ src: "a.png" })));

      expect(ProsemirrorHelper.findNodeByHash(document, "missing")).toBeNull();
    });
  });

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

  describe("getHeadings", () => {
    it("marks headings that are nested inside tables", () => {
      const node = doc(
        heading("One", 1),
        table(heading("Cell", 2)),
        heading("Two", 2)
      );

      expect(ProsemirrorHelper.getHeadings(node)).toEqual([
        expect.objectContaining({ title: "One", level: 1, inTable: false }),
        expect.objectContaining({ title: "Cell", level: 2, inTable: true }),
        expect.objectContaining({ title: "Two", level: 2, inTable: false }),
      ]);
    });

    it("marks headings after a nested table as still inside the outer table", () => {
      const node = doc(
        table(
          heading("Before", 2),
          table(heading("Inner", 3)),
          heading("After", 2)
        ),
        heading("Outside", 1)
      );

      expect(ProsemirrorHelper.getHeadings(node)).toEqual([
        expect.objectContaining({ title: "Before", inTable: true }),
        expect.objectContaining({ title: "Inner", inTable: true }),
        expect.objectContaining({ title: "After", inTable: true }),
        expect.objectContaining({ title: "Outside", inTable: false }),
      ]);
    });
  });
});
