import { faker } from "@faker-js/faker";
import { DeepPartial } from "utility-types";
import { MentionType, ProsemirrorData } from "@shared/types";
import { buildProseMirrorDoc, buildUser } from "@server/test/factories";
import { MentionAttrs, ProsemirrorHelper } from "./ProsemirrorHelper";

describe("ProsemirrorHelper", () => {
  describe("processMentions", () => {
    it("should handle deleted users", async () => {
      const user = await buildUser();
      const mentionAttrs: MentionAttrs = {
        id: "9a17c1c8-d178-4350-9001-203a73070fcb",
        type: MentionType.User,
        label: "test.user",
        actorId: user.id,
        modelId: user.id,
      };

      await user.destroy({ hooks: false });

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

      const newDoc = await ProsemirrorHelper.processMentions(doc);
      expect(newDoc.content?.[1]?.content?.[1].attrs?.label).toEqual("Unknown");
    });

    it("should handle updated users", async () => {
      const user = await buildUser();
      const mentionAttrs: MentionAttrs = {
        id: "9a17c1c8-d178-4350-9001-203a73070fcb",
        type: MentionType.User,
        label: "test.user",
        actorId: user.id,
        modelId: user.id,
      };

      await user.update({
        name: faker.name.firstName(),
      });

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

      const newDoc = await ProsemirrorHelper.processMentions(doc);
      expect(newDoc.content?.[1]?.content?.[1].attrs?.label).toEqual(user.name);
    });

    it("should handle multiple renamed users", async () => {
      const firstUser = await buildUser();
      const secondUser = await buildUser();

      const firstMentionAttrs: MentionAttrs = {
        id: "9a17c1c8-d178-4350-9001-203a73070fcb",
        type: MentionType.User,
        label: "first.user",
        actorId: firstUser.id,
        modelId: firstUser.id,
      };

      const secondMentionAttrs: MentionAttrs = {
        id: "31d5899f-e544-4ff6-b6d3-c49dd6b81901",
        type: MentionType.User,
        label: "second.user",
        actorId: secondUser.id,
        modelId: secondUser.id,
      };

      const firstNewName = faker.name.firstName();
      const secondNewName = faker.name.firstName();

      await firstUser.update({
        name: firstNewName,
      });

      await secondUser.update({
        name: secondNewName,
      });

      const mentionedParagraph: DeepPartial<ProsemirrorData> = {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "a paragraph with ",
          },
          {
            type: "mention",
            attrs: firstMentionAttrs,
          },
          {
            type: "text",
            text: " and ",
          },
          {
            type: "mention",
            attrs: secondMentionAttrs,
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

      const newDoc = await ProsemirrorHelper.processMentions(doc);
      expect(newDoc.content?.[1]?.content?.[1].attrs?.label).toEqual(
        firstNewName
      );
      expect(newDoc.content?.[1]?.content?.[3].attrs?.label).toEqual(
        secondNewName
      );
    });
  });

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

  describe("toProsemirror", () => {
    it("should convert markdown with heading and paragraph to ProseMirror document", () => {
      const markdown =
        "# Hello World\n\nThis is a paragraph with **bold text** and *italic text*.";

      const doc = ProsemirrorHelper.toProsemirror(markdown);

      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(2); // heading + paragraph

      // Check heading
      const heading = doc.content.child(0);
      expect(heading.type.name).toBe("heading");
      expect(heading.attrs.level).toBe(1);
      expect(heading.textContent).toBe("Hello World");

      // Check paragraph
      const paragraph = doc.content.child(1);
      expect(paragraph.type.name).toBe("paragraph");
      expect(paragraph.textContent).toBe(
        "This is a paragraph with bold text and italic text."
      );
    });

    it("should convert simple paragraph markdown", () => {
      const markdown = "This is a simple paragraph.";

      const doc = ProsemirrorHelper.toProsemirror(markdown);

      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(1);

      const paragraph = doc.content.child(0);
      expect(paragraph.type.name).toBe("paragraph");
      expect(paragraph.textContent).toBe("This is a simple paragraph.");
    });

    it("should convert markdown with lists", () => {
      const markdown = "- Item 1\n- Item 2\n- Item 3";

      const doc = ProsemirrorHelper.toProsemirror(markdown);

      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(1);

      const list = doc.content.child(0);
      expect(list.type.name).toBe("bullet_list");
      expect(list.content.childCount).toBe(3);

      // Check each list item
      for (let i = 0; i < 3; i++) {
        const listItem = list.content.child(i);
        expect(listItem.type.name).toBe("list_item");
        expect(listItem.textContent).toBe(`Item ${i + 1}`);
      }
    });

    it("should convert markdown with code blocks", () => {
      const markdown = "```javascript\nconst hello = 'world';\n```";

      const doc = ProsemirrorHelper.toProsemirror(markdown);

      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(1);

      const codeBlock = doc.content.child(0);
      expect(codeBlock.type.name).toBe("code_block");
      expect(codeBlock.attrs.language).toBe("javascript");
      expect(codeBlock.textContent).toBe("const hello = 'world';");
    });

    it("should convert ProsemirrorData object to ProseMirror document", () => {
      const prosemirrorData: ProsemirrorData = {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "Hello from ProseMirror data",
              },
            ],
          },
        ],
      };

      const doc = ProsemirrorHelper.toProsemirror(prosemirrorData);

      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(1);

      const paragraph = doc.content.child(0);
      expect(paragraph.type.name).toBe("paragraph");
      expect(paragraph.textContent).toBe("Hello from ProseMirror data");
    });

    it("should handle empty markdown string by creating empty paragraph", () => {
      const markdown = "";

      const doc = ProsemirrorHelper.toProsemirror(markdown);

      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(1); // Empty string creates an empty paragraph

      const paragraph = doc.content.child(0);
      expect(paragraph.type.name).toBe("paragraph");
      expect(paragraph.textContent).toBe("");
    });

    it("should convert markdown with multiple headings", () => {
      const markdown = "# Heading 1\n\n## Heading 2\n\n### Heading 3";

      const doc = ProsemirrorHelper.toProsemirror(markdown);

      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(3);

      // Check each heading level
      const heading1 = doc.content.child(0);
      expect(heading1.type.name).toBe("heading");
      expect(heading1.attrs.level).toBe(1);
      expect(heading1.textContent).toBe("Heading 1");

      const heading2 = doc.content.child(1);
      expect(heading2.type.name).toBe("heading");
      expect(heading2.attrs.level).toBe(2);
      expect(heading2.textContent).toBe("Heading 2");

      const heading3 = doc.content.child(2);
      expect(heading3.type.name).toBe("heading");
      expect(heading3.attrs.level).toBe(3);
      expect(heading3.textContent).toBe("Heading 3");
    });

    it("should convert <br> tags to break nodes", () => {
      const markdown = "Hello world<br>Next line";

      const doc = ProsemirrorHelper.toProsemirror(markdown);

      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(1);

      const paragraph = doc.content.child(0);
      expect(paragraph.type.name).toBe("paragraph");
      expect(paragraph.content.childCount).toBe(3); // text + break + text

      // Check first text node
      const firstText = paragraph.content.child(0);
      expect(firstText.type.name).toBe("text");
      expect(firstText.text).toBe("Hello world");

      // Check break node
      const breakNode = paragraph.content.child(1);
      expect(breakNode.type.name).toBe("br");

      // Check second text node
      const secondText = paragraph.content.child(2);
      expect(secondText.type.name).toBe("text");
      expect(secondText.text).toBe("Next line");
    });
  });
});
