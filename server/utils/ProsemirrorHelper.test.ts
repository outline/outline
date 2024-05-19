import { Node } from "prosemirror-model";
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
});
