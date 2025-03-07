import { DeepPartial } from "utility-types";
import { MentionType, ProsemirrorData } from "@shared/types";
import { buildProseMirrorDoc } from "@server/test/factories";
import { MentionAttrs, ProsemirrorHelper } from "./ProsemirrorHelper";

describe("ProsemirrorHelper", () => {
  describe("getNodeForMentionEmail", () => {
    it("should return the paragraph node", () => {
      const mentionAttrs: MentionAttrs = {
        id: "31d5899f-e544-4ff6-b6d3-c49dd6b81901",
        type: MentionType.User,
        label: "test.user",
        actorId: "ccec260a-e060-4925-ade8-17cfabaf2cac",
        modelId: "9a17c1c8-d178-4350-9001-203a73070fcb",
      };

      const mentionedParagraph: DeepPartial<ProsemirrorData> = {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "a paragraph with ",
          },
          {
            type: "mention",
            attrs: mentionAttrs,
          },
          {
            type: "text",
            text: " mentioned",
          },
        ],
      };

      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "some content in a paragraph",
            },
          ],
        },
        mentionedParagraph,
      ]);

      const expectedDoc = buildProseMirrorDoc([mentionedParagraph]);

      const newDoc = ProsemirrorHelper.getNodeForMentionEmail(
        doc,
        mentionAttrs
      );

      expect(newDoc?.toJSON()).toEqual(expectedDoc.toJSON());
    });

    it("should return the heading node", () => {
      const mentionAttrs: MentionAttrs = {
        id: "31d5899f-e544-4ff6-b6d3-c49dd6b81901",
        type: MentionType.User,
        label: "test.user",
        actorId: "ccec260a-e060-4925-ade8-17cfabaf2cac",
        modelId: "9a17c1c8-d178-4350-9001-203a73070fcb",
      };

      const mentionedHeading: DeepPartial<ProsemirrorData> = {
        type: "heading",
        attrs: {
          level: 2,
        },
        content: [
          {
            type: "text",
            text: "a heading with ",
          },
          {
            type: "mention",
            attrs: mentionAttrs,
          },
          {
            type: "text",
            text: " mentioned",
          },
        ],
      };

      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "some content in a paragraph",
            },
          ],
        },
        mentionedHeading,
      ]);

      const expectedDoc = buildProseMirrorDoc([mentionedHeading]);

      const newDoc = ProsemirrorHelper.getNodeForMentionEmail(
        doc,
        mentionAttrs
      );

      expect(newDoc?.toJSON()).toEqual(expectedDoc.toJSON());
    });

    it("should return the table node with the mentioned row only", () => {
      const mentionAttrs: MentionAttrs = {
        id: "31d5899f-e544-4ff6-b6d3-c49dd6b81901",
        type: MentionType.User,
        label: "test.user",
        actorId: "ccec260a-e060-4925-ade8-17cfabaf2cac",
        modelId: "9a17c1c8-d178-4350-9001-203a73070fcb",
      };

      const mentionedRow: DeepPartial<ProsemirrorData> = {
        type: "tr",
        content: [
          {
            type: "td",
            attrs: {
              colspan: 1,
              rowspan: 1,
            },
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "mention",
                    attrs: mentionAttrs,
                  },
                ],
              },
            ],
          },
        ],
      };

      const doc = buildProseMirrorDoc([
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
          type: "table",
          content: [
            {
              type: "td",
              attrs: {
                colspan: 1,
                rowspan: 1,
              },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "cell content",
                    },
                  ],
                },
              ],
            },
            mentionedRow,
          ],
        },
      ]);

      const expectedDoc = buildProseMirrorDoc([
        {
          type: "table",
          content: [mentionedRow],
        },
      ]);

      const newDoc = ProsemirrorHelper.getNodeForMentionEmail(
        doc,
        mentionAttrs
      );

      expect(newDoc?.toJSON()).toEqual(expectedDoc.toJSON());
    });

    it("should return the checkbox list with the mentioned item only", () => {
      const mentionAttrs: MentionAttrs = {
        id: "31d5899f-e544-4ff6-b6d3-c49dd6b81901",
        type: MentionType.User,
        label: "test.user",
        actorId: "ccec260a-e060-4925-ade8-17cfabaf2cac",
        modelId: "9a17c1c8-d178-4350-9001-203a73070fcb",
      };

      const mentionedItem: DeepPartial<ProsemirrorData> = {
        type: "checkbox_item",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "task B ",
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "mention",
                    attrs: mentionAttrs,
                  },
                ],
              },
            ],
          },
        ],
      };

      const doc = buildProseMirrorDoc([
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
          type: "checkbox_list",
          content: [
            {
              type: "checkbox_item",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: "task A",
                    },
                  ],
                },
              ],
            },
            mentionedItem,
          ],
        },
      ]);

      const expectedDoc = buildProseMirrorDoc([
        {
          type: "checkbox_list",
          content: [mentionedItem],
        },
      ]);

      const newDoc = ProsemirrorHelper.getNodeForMentionEmail(
        doc,
        mentionAttrs
      );

      expect(newDoc?.toJSON()).toEqual(expectedDoc.toJSON());
    });

    it("should not return anything when the mention attrs could not be found", () => {
      const mentionAttrs: MentionAttrs = {
        id: "31d5899f-e544-4ff6-b6d3-c49dd6b81901",
        type: MentionType.User,
        label: "test.user",
        actorId: "ccec260a-e060-4925-ade8-17cfabaf2cac",
        modelId: "9a17c1c8-d178-4350-9001-203a73070fcb",
      };

      const mentionedParagraph: DeepPartial<ProsemirrorData> = {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "a paragraph with ",
          },
          {
            type: "mention",
            attrs: { ...mentionAttrs, modelId: "test-model" },
          },
          {
            type: "text",
            text: " mentioned",
          },
        ],
      };

      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "some content in a paragraph",
            },
          ],
        },
        mentionedParagraph,
      ]);

      const newDoc = ProsemirrorHelper.getNodeForMentionEmail(
        doc,
        mentionAttrs
      );

      expect(newDoc).toBeUndefined();
    });
  });
});
