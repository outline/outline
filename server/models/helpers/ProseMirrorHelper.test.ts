import { faker } from "@faker-js/faker";
import type { DeepPartial } from "utility-types";
import type { ProsemirrorData } from "@shared/types";
import { MentionType } from "@shared/types";
import { ProsemirrorHelper as SharedProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { createContext } from "@server/context";
import { buildProseMirrorDoc, buildUser } from "@server/test/factories";
import type { MentionAttrs } from "./ProsemirrorHelper";
import { ProsemirrorHelper } from "./ProsemirrorHelper";

jest.mock("@server/storage/files");

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

    it("should convert markdown with unchecked checklist items", () => {
      const markdown = "- [ ] Task one\n- [ ] Task two";

      const doc = ProsemirrorHelper.toProsemirror(markdown);

      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(1);

      const checkboxList = doc.content.child(0);
      expect(checkboxList.type.name).toBe("checkbox_list");
      expect(checkboxList.content.childCount).toBe(2);

      // Check first item
      const firstItem = checkboxList.content.child(0);
      expect(firstItem.type.name).toBe("checkbox_item");
      expect(firstItem.attrs.checked).toBe(false);
      expect(firstItem.textContent).toBe("Task one");

      // Check second item
      const secondItem = checkboxList.content.child(1);
      expect(secondItem.type.name).toBe("checkbox_item");
      expect(secondItem.attrs.checked).toBe(false);
      expect(secondItem.textContent).toBe("Task two");
    });

    it("should convert markdown with checked checklist items", () => {
      const markdown = "- [x] Completed task\n- [X] Another completed";

      const doc = ProsemirrorHelper.toProsemirror(markdown);

      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(1);

      const checkboxList = doc.content.child(0);
      expect(checkboxList.type.name).toBe("checkbox_list");
      expect(checkboxList.content.childCount).toBe(2);

      // Check first item is checked
      const firstItem = checkboxList.content.child(0);
      expect(firstItem.type.name).toBe("checkbox_item");
      expect(firstItem.attrs.checked).toBe(true);
      expect(firstItem.textContent).toBe("Completed task");

      // Check second item is checked (uppercase X)
      const secondItem = checkboxList.content.child(1);
      expect(secondItem.type.name).toBe("checkbox_item");
      expect(secondItem.attrs.checked).toBe(true);
      expect(secondItem.textContent).toBe("Another completed");
    });

    it("should convert markdown with mixed checked and unchecked items", () => {
      const markdown = "- [x] Done\n- [ ] Not done\n- [x] Also done";

      const doc = ProsemirrorHelper.toProsemirror(markdown);

      expect(doc.type.name).toBe("doc");
      expect(doc.content.childCount).toBe(1);

      const checkboxList = doc.content.child(0);
      expect(checkboxList.type.name).toBe("checkbox_list");
      expect(checkboxList.content.childCount).toBe(3);

      expect(checkboxList.content.child(0).attrs.checked).toBe(true);
      expect(checkboxList.content.child(1).attrs.checked).toBe(false);
      expect(checkboxList.content.child(2).attrs.checked).toBe(true);
    });

    it("should convert markdown table with multiple checklist items in cell separated by br", () => {
      const markdown = `| Tasks |
| --- |
| [ ] First<br>[ ] Second<br>[x] Third |`;

      const doc = ProsemirrorHelper.toProsemirror(markdown);

      expect(doc.type.name).toBe("doc");

      const table = doc.content.child(0);
      expect(table.type.name).toBe("table");

      const dataRow = table.content.child(1);
      const cell = dataRow.content.child(0);

      // Cell should contain a single checkbox_list with 3 items
      const checkboxList = cell.content.child(0);
      expect(checkboxList.type.name).toBe("checkbox_list");
      expect(checkboxList.content.childCount).toBe(3);

      // First item - unchecked
      const firstItem = checkboxList.content.child(0);
      expect(firstItem.type.name).toBe("checkbox_item");
      expect(firstItem.attrs.checked).toBe(false);
      expect(firstItem.textContent).toBe("First");

      // Second item - unchecked
      const secondItem = checkboxList.content.child(1);
      expect(secondItem.type.name).toBe("checkbox_item");
      expect(secondItem.attrs.checked).toBe(false);
      expect(secondItem.textContent).toBe("Second");

      // Third item - checked
      const thirdItem = checkboxList.content.child(2);
      expect(thirdItem.type.name).toBe("checkbox_item");
      expect(thirdItem.attrs.checked).toBe(true);
      expect(thirdItem.textContent).toBe("Third");
    });
  });

  describe("removeFirstHeading", () => {
    it("should remove an H1 that is the first child", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Content" }],
        },
      ]);

      const result = ProsemirrorHelper.removeFirstHeading(doc);

      expect(result.content.childCount).toBe(1);
      expect(result.content.child(0).type.name).toBe("paragraph");
      expect(result.content.child(0).textContent).toBe("Content");
    });

    it("should not remove an H2 heading", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Subtitle" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Content" }],
        },
      ]);

      const result = ProsemirrorHelper.removeFirstHeading(doc);

      expect(result.content.childCount).toBe(2);
      expect(result.content.child(0).type.name).toBe("heading");
      expect(result.content.child(0).attrs.level).toBe(2);
    });

    it("should not remove a paragraph that is the first child", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [{ type: "text", text: "First paragraph" }],
        },
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
      ]);

      const result = ProsemirrorHelper.removeFirstHeading(doc);

      expect(result.content.childCount).toBe(2);
      expect(result.content.child(0).type.name).toBe("paragraph");
    });

    it("should return document with empty paragraph when H1 is only content", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Only Title" }],
        },
      ]);

      const result = ProsemirrorHelper.removeFirstHeading(doc);

      expect(result.content.childCount).toBe(1);
      expect(result.content.child(0).type.name).toBe("paragraph");
      expect(result.content.child(0).textContent).toBe("");
    });
  });

  describe("extractEmojiFromStart", () => {
    it("should extract an emoji from the start of the document", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [{ type: "text", text: "🚀 Launch day" }],
        },
      ]);

      const result = ProsemirrorHelper.extractEmojiFromStart(doc);

      expect(result.emoji).toBe("🚀");
      expect(result.doc.content.child(0).textContent).toBe(" Launch day");
    });

    it("should return undefined emoji when no emoji at start", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [{ type: "text", text: "No emoji here" }],
        },
      ]);

      const result = ProsemirrorHelper.extractEmojiFromStart(doc);

      expect(result.emoji).toBeUndefined();
      expect(result.doc.content.child(0).textContent).toBe("No emoji here");
    });

    it("should not extract emoji that is not at position 0", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [{ type: "text", text: "Hello 🚀 world" }],
        },
      ]);

      const result = ProsemirrorHelper.extractEmojiFromStart(doc);

      expect(result.emoji).toBeUndefined();
    });

    it("should handle empty document", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [],
        },
      ]);

      const result = ProsemirrorHelper.extractEmojiFromStart(doc);

      expect(result.emoji).toBeUndefined();
    });

    it("should extract emoji from nested content", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "📚 Documentation" }],
        },
      ]);

      const result = ProsemirrorHelper.extractEmojiFromStart(doc);

      expect(result.emoji).toBe("📚");
      expect(result.doc.content.child(0).textContent).toBe(" Documentation");
    });

    it("should handle flag emoji", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [{ type: "text", text: "🇺🇸 United States" }],
        },
      ]);

      const result = ProsemirrorHelper.extractEmojiFromStart(doc);

      expect(result.emoji).toBe("🇺🇸");
      expect(result.doc.content.child(0).textContent).toBe(" United States");
    });
  });

  describe("replaceImagesWithAttachments", () => {
    it("should return the same document when there are no images", async () => {
      const user = await buildUser();
      const ctx = createContext({ user });

      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [{ type: "text", text: "No images here" }],
        },
      ]);

      const result = await ProsemirrorHelper.replaceImagesWithAttachments(
        ctx,
        doc,
        user
      );

      expect(result.toJSON()).toEqual(doc.toJSON());
    });

    it("should correctly identify images in a document", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "image",
              attrs: {
                src: "https://example.com/image.png",
                alt: "Test image",
              },
            },
          ],
        },
      ]);

      const images = SharedProsemirrorHelper.getImages(doc);
      expect(images.length).toBe(1);
      expect(images[0].attrs.src).toBe("https://example.com/image.png");
      expect(images[0].attrs.alt).toBe("Test image");
    });

    it("should skip images with invalid URLs", async () => {
      const user = await buildUser();
      const ctx = createContext({ user });

      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "image",
              attrs: {
                src: "not-a-valid-url",
                alt: "Invalid",
              },
            },
          ],
        },
      ]);

      const result = await ProsemirrorHelper.replaceImagesWithAttachments(
        ctx,
        doc,
        user
      );

      // Document should remain unchanged since URL is invalid
      expect(result.toJSON()).toEqual(doc.toJSON());
    });

    it("should skip images with internal URLs", async () => {
      const user = await buildUser();
      const ctx = createContext({ user });

      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "image",
              attrs: {
                src: "/api/attachments.redirect?id=existing-id",
                alt: "Internal",
              },
            },
          ],
        },
      ]);

      const result = await ProsemirrorHelper.replaceImagesWithAttachments(
        ctx,
        doc,
        user
      );

      // Document should remain unchanged since URL is internal
      expect(result.toJSON()).toEqual(doc.toJSON());
    });

    it("should handle document with multiple node types", async () => {
      const user = await buildUser();
      const ctx = createContext({ user });

      const doc = buildProseMirrorDoc([
        {
          type: "heading",
          attrs: { level: 1 },
          content: [{ type: "text", text: "Title" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Some text" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "image",
              attrs: {
                src: "invalid-url",
                alt: "Image",
              },
            },
          ],
        },
      ]);

      const result = await ProsemirrorHelper.replaceImagesWithAttachments(
        ctx,
        doc,
        user
      );

      // Document structure should be preserved
      expect(result.content.childCount).toBe(3);
      expect(result.content.child(0).type.name).toBe("heading");
      expect(result.content.child(1).type.name).toBe("paragraph");
      expect(result.content.child(2).type.name).toBe("paragraph");
    });

    it("should handle empty document", async () => {
      const user = await buildUser();
      const ctx = createContext({ user });

      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [],
        },
      ]);

      const result = await ProsemirrorHelper.replaceImagesWithAttachments(
        ctx,
        doc,
        user
      );

      expect(result.toJSON()).toEqual(doc.toJSON());
    });
  });
});
