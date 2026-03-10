import { Node } from "prosemirror-model";
import { ProsemirrorHelper as ServerProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { schema } from "@server/editor";

// Note: The test is here rather than shared to access the schema
describe("#ProsemirrorHelper", () => {
  describe("#trim", () => {
    it("Does not remove single paragraph", () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  ",
              },
            ],
          },
        ],
      });

      expect(ProsemirrorHelper.trim(doc).toJSON()).toEqual({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  ",
              },
            ],
          },
        ],
      });
    });

    it("Removes empty first paragraph", () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  ",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "one",
              },
            ],
          },
        ],
      });

      expect(ProsemirrorHelper.trim(doc).toJSON()).toEqual({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "one",
              },
            ],
          },
        ],
      });
    });

    it("Removes empty last paragraph", () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "nice",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  ",
              },
            ],
          },
        ],
      });

      expect(ProsemirrorHelper.trim(doc).toJSON()).toEqual({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "nice",
              },
            ],
          },
        ],
      });
    });

    it("Removes multiple empty paragraphs", () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "paragraph",
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "   ",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "nice",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "  ",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: " ",
              },
            ],
          },
        ],
      });

      expect(ProsemirrorHelper.trim(doc).toJSON()).toEqual({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "nice",
              },
            ],
          },
        ],
      });
    });
  });

  describe("#removeMarks", () => {
    it("preserves table cell background color when removing comment marks", () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "table",
            content: [
              {
                type: "tr",
                content: [
                  {
                    type: "td",
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                      alignment: null,
                      colwidth: null,
                      marks: [
                        {
                          type: "background",
                          attrs: { color: "#e8f5e9" },
                        },
                        {
                          type: "comment",
                          attrs: { id: "comment-1" },
                        },
                      ],
                    },
                    content: [{ type: "paragraph" }],
                  },
                ],
              },
            ],
          },
        ],
      });

      const result = ServerProsemirrorHelper.removeMarks(doc, ["comment"]);
      const tdAttrsMarks = result.content?.[0]?.content?.[0]?.content?.[0]
        ?.attrs?.marks as Array<{ type: string }> | undefined;

      expect(
        tdAttrsMarks?.find((m) => m.type === "background")
      ).toBeDefined();
      expect(
        tdAttrsMarks?.find((m) => m.type === "comment")
      ).toBeUndefined();
    });

    it("removes comment marks from text nodes when duplicating", () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Hello",
                marks: [{ type: "comment", attrs: { id: "comment-2" } }],
              },
            ],
          },
        ],
      });

      const result = ServerProsemirrorHelper.removeMarks(doc, ["comment"]);
      const textMarks = result.content?.[0]?.content?.[0]?.marks as
        | Array<{ type: string }>
        | undefined;

      expect(textMarks?.find((m) => m.type === "comment")).toBeUndefined();
    });
  });
});
