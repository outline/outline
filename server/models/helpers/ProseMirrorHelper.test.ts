import { faker } from "@faker-js/faker";
import { Node } from "prosemirror-model";
import type { DeepPartial } from "utility-types";
import { prosemirrorToYDoc, yDocToProsemirrorJSON } from "y-prosemirror";
import * as Y from "yjs";
import type { ProsemirrorData } from "@shared/types";
import { MentionType } from "@shared/types";
import { ProsemirrorHelper as SharedProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { createContext } from "@server/context";
import { parser, schema } from "@server/editor";
import env from "@server/env";
import { Attachment } from "@server/models";
import { buildProseMirrorDoc, buildUser } from "@server/test/factories";
import type { MentionAttrs } from "./ProsemirrorHelper";
import { ProsemirrorHelper } from "./ProsemirrorHelper";

vi.mock("@server/storage/files");

describe("ProsemirrorHelper", () => {
  describe("toHTML", () => {
    it("should render images with toDOM for static output", async () => {
      const doc = parser.parse("![caption](https://example.com/image.png)")!;
      const html = await ProsemirrorHelper.toHTML(doc, {
        includeStyles: false,
        includeHead: false,
      });
      expect(html).toContain('<img src="https://example.com/image.png"');
      expect(html).not.toContain("display: none");
      expect(html).not.toContain("component-image");
    });

    it("should not include editable regions in the output", async () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "video",
            attrs: {
              src: "https://example.com/video.mp4",
              title: "A video",
              width: 400,
              height: 300,
            },
          },
        ],
      });
      const html = await ProsemirrorHelper.toHTML(doc, {
        includeStyles: false,
        includeHead: false,
      });
      expect(html).toContain("<video");
      expect(html).toContain("A video");
      expect(html).not.toContain('contenteditable="true"');
    });

    it("should render a pdf attachment preview", async () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "attachment",
            attrs: {
              id: "8f0e2a1c-1f2b-4c3d-9e4f-5a6b7c8d9e0f",
              href: "https://example.com/file.pdf",
              title: "file.pdf",
              size: 1024,
              preview: true,
              contentType: "application/pdf",
            },
          },
        ],
      });
      const html = await ProsemirrorHelper.toHTML(doc, {
        includeStyles: false,
        includeHead: false,
      });
      expect(html).toContain("<embed");
      expect(html).toContain("https://example.com/file.pdf");
    });

    it("should include styles of rendered components", async () => {
      const doc = Node.fromJSON(schema, {
        type: "doc",
        content: [
          {
            type: "embed",
            attrs: { href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
          },
        ],
      });
      const html = await ProsemirrorHelper.toHTML(doc);
      const iframeClass = html
        .match(/<iframe[^>]*class="([^"]+)"/)?.[1]
        .split(" ")
        .pop();
      expect(iframeClass).toBeTruthy();
      expect(html).toContain(`.${iframeClass}`);
    });
  });

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

    it("should trim a table to the mentioned row", () => {
      const mentionAttrs: MentionAttrs = {
        id: "31d5899f-e544-4ff6-b6d3-c49dd6b81901",
        type: MentionType.User,
        label: "test.user",
        actorId: "ccec260a-e060-4925-ade8-17cfabaf2cac",
        modelId: "9a17c1c8-d178-4350-9001-203a73070fcb",
      };

      const row = (text: string): DeepPartial<ProsemirrorData> => ({
        type: "tr",
        content: [
          {
            type: "td",
            attrs: { colspan: 1, rowspan: 1 },
            content: [{ type: "paragraph", content: [{ type: "text", text }] }],
          },
        ],
      });

      const mentionedRow: DeepPartial<ProsemirrorData> = {
        type: "tr",
        content: [
          {
            type: "td",
            attrs: { colspan: 1, rowspan: 1 },
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "row B " },
                  { type: "mention", attrs: mentionAttrs },
                ],
              },
            ],
          },
        ],
      };

      const doc = buildProseMirrorDoc([
        {
          type: "table",
          content: [row("row A"), mentionedRow, row("row C")],
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

    it("should trim a checkbox list to the mentioned item and one either side", () => {
      const mentionAttrs: MentionAttrs = {
        id: "31d5899f-e544-4ff6-b6d3-c49dd6b81901",
        type: MentionType.User,
        label: "test.user",
        actorId: "ccec260a-e060-4925-ade8-17cfabaf2cac",
        modelId: "9a17c1c8-d178-4350-9001-203a73070fcb",
      };

      const checkboxItem = (text: string): DeepPartial<ProsemirrorData> => ({
        type: "checkbox_item",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      });

      const mentionedItem: DeepPartial<ProsemirrorData> = {
        type: "checkbox_item",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "task C " },
              { type: "mention", attrs: mentionAttrs },
            ],
          },
        ],
      };

      const doc = buildProseMirrorDoc([
        {
          type: "checkbox_list",
          content: [
            checkboxItem("task A"),
            checkboxItem("task B"),
            mentionedItem,
            checkboxItem("task D"),
            checkboxItem("task E"),
          ],
        },
      ]);

      // The mention is in the third item, so the snippet keeps items two
      // through four.
      const expectedDoc = buildProseMirrorDoc([
        {
          type: "checkbox_list",
          content: [
            checkboxItem("task B"),
            mentionedItem,
            checkboxItem("task D"),
          ],
        },
      ]);

      const newDoc = ProsemirrorHelper.getNodeForMentionEmail(
        doc,
        mentionAttrs
      );

      expect(newDoc?.toJSON()).toEqual(expectedDoc.toJSON());
    });

    it("should trim a bullet list to the mentioned item and one either side", () => {
      const mentionAttrs: MentionAttrs = {
        id: "31d5899f-e544-4ff6-b6d3-c49dd6b81901",
        type: MentionType.User,
        label: "test.user",
        actorId: "ccec260a-e060-4925-ade8-17cfabaf2cac",
        modelId: "9a17c1c8-d178-4350-9001-203a73070fcb",
      };

      const listItem = (text: string): DeepPartial<ProsemirrorData> => ({
        type: "list_item",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      });

      const mentionedItem: DeepPartial<ProsemirrorData> = {
        type: "list_item",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "item A " },
              { type: "mention", attrs: mentionAttrs },
            ],
          },
        ],
      };

      const doc = buildProseMirrorDoc([
        {
          type: "bullet_list",
          content: [mentionedItem, listItem("item B"), listItem("item C")],
        },
      ]);

      // The mention is in the first item, so the window is clamped to the
      // mentioned item and the one that follows.
      const expectedDoc = buildProseMirrorDoc([
        {
          type: "bullet_list",
          content: [mentionedItem, listItem("item B")],
        },
      ]);

      const newDoc = ProsemirrorHelper.getNodeForMentionEmail(
        doc,
        mentionAttrs
      );

      expect(newDoc?.toJSON()).toEqual(expectedDoc.toJSON());
    });

    it("should advance an ordered list's start to keep numbering aligned", () => {
      const mentionAttrs: MentionAttrs = {
        id: "31d5899f-e544-4ff6-b6d3-c49dd6b81901",
        type: MentionType.User,
        label: "test.user",
        actorId: "ccec260a-e060-4925-ade8-17cfabaf2cac",
        modelId: "9a17c1c8-d178-4350-9001-203a73070fcb",
      };

      const listItem = (text: string): DeepPartial<ProsemirrorData> => ({
        type: "list_item",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      });

      const mentionedItem: DeepPartial<ProsemirrorData> = {
        type: "list_item",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "item D " },
              { type: "mention", attrs: mentionAttrs },
            ],
          },
        ],
      };

      const doc = buildProseMirrorDoc([
        {
          type: "ordered_list",
          attrs: { order: 1, listStyle: "number" },
          content: [
            listItem("item A"),
            listItem("item B"),
            listItem("item C"),
            mentionedItem,
            listItem("item E"),
          ],
        },
      ]);

      // The mention is in the fourth item, so items three through five are kept
      // and the list starts at three to preserve the original numbering.
      const expectedDoc = buildProseMirrorDoc([
        {
          type: "ordered_list",
          attrs: { order: 3, listStyle: "number" },
          content: [listItem("item C"), mentionedItem, listItem("item E")],
        },
      ]);

      const newDoc = ProsemirrorHelper.getNodeForMentionEmail(
        doc,
        mentionAttrs
      );

      expect(newDoc?.toJSON()).toEqual(expectedDoc.toJSON());
    });

    it("should return the whole blockquote containing the mention", () => {
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
            text: "a quote with ",
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
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "some other line",
                },
              ],
            },
            mentionedParagraph,
          ],
        },
      ]);

      const expectedDoc = buildProseMirrorDoc([
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "some other line",
                },
              ],
            },
            mentionedParagraph,
          ],
        },
      ]);

      const newDoc = ProsemirrorHelper.getNodeForMentionEmail(
        doc,
        mentionAttrs
      );

      expect(newDoc?.toJSON()).toEqual(expectedDoc.toJSON());
    });

    it("should stop climbing when the container exceeds the size budget", () => {
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
            text: "a quote with ",
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
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "x".repeat(ProsemirrorHelper.mentionEmailMaxChars + 1),
                },
              ],
            },
            mentionedParagraph,
          ],
        },
      ]);

      // The blockquote overflows the budget, so the snippet falls back to the
      // mention's own paragraph rather than the surrounding container.
      const expectedDoc = buildProseMirrorDoc([mentionedParagraph]);

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

  describe("replaceDocumentReferences", () => {
    const replacement = {
      id: "ca3a20ba-0eab-4b04-b45c-b9d0e9d6d3f0",
      path: "/doc/copy-of-a-document-hLpJHTvIRW",
    };
    const references = new Map([
      ["7a0e9dbc-1de3-4dd7-b1a3-1a5b1e5ecd2e", replacement],
      ["oCB0mUOc5f", replacement],
    ]);

    const linkedParagraph = (href: string) => ({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "A link",
          marks: [{ type: "link", attrs: { href } }],
        },
      ],
    });

    const mentionParagraph = (type: MentionType, modelId: string) => ({
      type: "paragraph",
      content: [
        {
          type: "mention",
          attrs: {
            type,
            modelId,
            label: "A mention",
            id: "d4f6a3ee-0d59-4e2e-b1a8-2f0c5f6b3f8d",
          },
        },
      ],
    });

    const hrefAfterReplace = (href: string) => {
      const result = ProsemirrorHelper.replaceDocumentReferences(
        buildProseMirrorDoc([linkedParagraph(href)]),
        references
      );
      return result.content![0].content![0].marks![0].attrs!.href;
    };

    const modelIdAfterReplace = (type: MentionType, modelId: string) => {
      const result = ProsemirrorHelper.replaceDocumentReferences(
        buildProseMirrorDoc([mentionParagraph(type, modelId)]),
        references
      );
      return result.content![0].content![0].attrs!.modelId;
    };

    it("should replace a link to a document by slug", () => {
      expect(hrefAfterReplace("/doc/a-document-oCB0mUOc5f")).toBe(
        replacement.path
      );
    });

    it("should replace a link to a document by id", () => {
      expect(
        hrefAfterReplace("/doc/7a0e9dbc-1de3-4dd7-b1a3-1a5b1e5ecd2e")
      ).toBe(replacement.path);
    });

    it("should retain the hash and query of a replaced link", () => {
      expect(hrefAfterReplace("/doc/a-document-oCB0mUOc5f#heading")).toBe(
        `${replacement.path}#heading`
      );
      expect(hrefAfterReplace("/doc/a-document-oCB0mUOc5f?foo=bar")).toBe(
        `${replacement.path}?foo=bar`
      );
    });

    it("should replace a fully qualified link, keeping it fully qualified", () => {
      expect(hrefAfterReplace(`${env.URL}/doc/a-document-oCB0mUOc5f`)).toBe(
        `${env.URL}${replacement.path}`
      );
      expect(
        hrefAfterReplace(`${env.URL}/doc/a-document-oCB0mUOc5f#heading`)
      ).toBe(`${env.URL}${replacement.path}#heading`);
    });

    it("should replace a fully qualified link written with another host", () => {
      expect(
        hrefAfterReplace("https://wiki.example.com/doc/a-document-oCB0mUOc5f")
      ).toBe(`https://wiki.example.com${replacement.path}`);
      expect(
        hrefAfterReplace("http://localhost:3000/doc/a-document-oCB0mUOc5f")
      ).toBe(`http://localhost:3000${replacement.path}`);
    });

    it("should replace the text of a link that is displayed as its url", () => {
      const href = "/doc/a-document-oCB0mUOc5f";
      const result = ProsemirrorHelper.replaceDocumentReferences(
        buildProseMirrorDoc([
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: href,
                marks: [{ type: "link", attrs: { href } }],
              },
            ],
          },
        ]),
        references
      );
      const text = result.content![0].content![0];

      expect(text.text).toBe(replacement.path);
      expect(text.marks![0].attrs!.href).toBe(replacement.path);
    });

    it("should not replace links to other documents", () => {
      const relative = "/doc/another-document-Iz6qBGZQIU";
      expect(hrefAfterReplace(relative)).toBe(relative);

      const qualified = `${env.URL}/doc/another-document-Iz6qBGZQIU`;
      expect(hrefAfterReplace(qualified)).toBe(qualified);
    });

    it("should not replace links that are not to a document", () => {
      const href = "/search?query=oCB0mUOc5f";
      expect(hrefAfterReplace(href)).toBe(href);
    });

    it("should not replace links with an unsupported protocol", () => {
      const href = "mailto:oCB0mUOc5f@example.com";
      expect(hrefAfterReplace(href)).toBe(href);
    });

    it("should replace the model of a document mention", () => {
      expect(
        modelIdAfterReplace(
          MentionType.Document,
          "7a0e9dbc-1de3-4dd7-b1a3-1a5b1e5ecd2e"
        )
      ).toBe(replacement.id);
    });

    it("should not replace the model of a user mention", () => {
      expect(
        modelIdAfterReplace(
          MentionType.User,
          "7a0e9dbc-1de3-4dd7-b1a3-1a5b1e5ecd2e"
        )
      ).toBe("7a0e9dbc-1de3-4dd7-b1a3-1a5b1e5ecd2e");
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

    it("should extract emoji when the text node is only the emoji", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "🎯" },
            { type: "text", text: "Overview" },
          ],
        },
      ]);

      const result = ProsemirrorHelper.extractEmojiFromStart(doc);

      expect(result.emoji).toBe("🎯");
      // The emoji-only text node is dropped rather than left empty.
      expect(result.doc.content.child(0).textContent).toBe("Overview");
    });

    it("should extract a marked emoji-only text node without throwing", () => {
      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "🎯", marks: [{ type: "strong" }] },
            { type: "text", text: "Overview" },
          ],
        },
      ]);

      const result = ProsemirrorHelper.extractEmojiFromStart(doc);

      expect(result.emoji).toBe("🎯");
      expect(result.doc.content.child(0).textContent).toBe("Overview");
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

      const images = ProsemirrorHelper.getImages(doc);
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

    it("should turn a link pointing at a data URI into an attachment", async () => {
      const user = await buildUser();
      const ctx = createContext({ user });

      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "the spec",
              marks: [
                {
                  type: "link",
                  attrs: {
                    href: "data:application/pdf;base64,JVBERi0xLjQK",
                  },
                },
              ],
            },
          ],
        },
      ]);

      const result = await ProsemirrorHelper.replaceImagesWithAttachments(
        ctx,
        doc,
        user
      );

      const link = result.content
        .child(0)
        .content.child(0)
        .marks.find((mark) => mark.type.name === "link");

      expect(link?.attrs.href).toMatch(/^\/api\/attachments\.redirect\?id=/);
      expect(await Attachment.count({ where: { teamId: user.teamId } })).toBe(
        1
      );
    });

    it("should leave an ordinary external link untouched", async () => {
      const user = await buildUser();
      const ctx = createContext({ user });

      const doc = buildProseMirrorDoc([
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "example",
              marks: [
                { type: "link", attrs: { href: "https://example.com/page" } },
              ],
            },
          ],
        },
      ]);

      const result = await ProsemirrorHelper.replaceImagesWithAttachments(
        ctx,
        doc,
        user
      );

      expect(result.toJSON()).toEqual(doc.toJSON());
      expect(await Attachment.count({ where: { teamId: user.teamId } })).toBe(
        0
      );
    });
  });

  describe("#applyCommentMarkByText", () => {
    const buildDocState = (content: object[]) => {
      const doc = Node.fromJSON(schema, { type: "doc", content });
      const ydoc = prosemirrorToYDoc(doc, "default");
      return Y.encodeStateAsUpdate(ydoc);
    };

    const getCommentMarks = (result: Uint8Array) => {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, result);
      const doc = Node.fromJSON(schema, yDocToProsemirrorJSON(ydoc, "default"));

      const marks: { id: string; text: string }[] = [];
      doc.descendants((node) => {
        if (node.isText) {
          const m = node.marks.find((mark) => mark.type.name === "comment");
          if (m) {
            marks.push({ id: m.attrs.id, text: node.text ?? "" });
          }
        }
        return true;
      });
      return marks;
    };

    it("anchors a comment to a substring within a single paragraph", () => {
      const docState = buildDocState([
        {
          type: "paragraph",
          content: [{ type: "text", text: "The quick brown fox jumps" }],
        },
      ]);

      const result = ProsemirrorHelper.applyCommentMarkByText({
        docState,
        anchorText: "brown fox",
        commentId: "comment-1",
        userId: "user-1",
      });

      expect(result?.state).toBeInstanceOf(Uint8Array);
      const marks = getCommentMarks(result!.state);
      expect(marks).toHaveLength(1);
      expect(marks[0]).toEqual({ id: "comment-1", text: "brown fox" });
    });

    it("anchors a comment to text spanning multiple top-level blocks", () => {
      const docState = buildDocState([
        {
          type: "paragraph",
          content: [{ type: "text", text: "first paragraph" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "second paragraph" }],
        },
      ]);

      const result = ProsemirrorHelper.applyCommentMarkByText({
        docState,
        anchorText: "paragraph\nsecond",
        commentId: "comment-1",
        userId: "user-1",
      });

      expect(result?.state).toBeInstanceOf(Uint8Array);
      const marks = getCommentMarks(result!.state);
      expect(marks.map((m) => m.text)).toEqual(["paragraph", "second"]);
      expect(marks.every((m) => m.id === "comment-1")).toBe(true);
    });

    it("matches anchorText that crosses a leaf node's leafText (e.g. a mention)", () => {
      // Mention nodes are atoms whose plain-text content comes from
      // spec.leafText — for a User mention this is "@<label>". Without
      // textBetween's leaf handling the mention would be invisible to the
      // matcher, so a span like "Hello @Alice, how" would not be found.
      // The mention itself disallows marks (schema marks: "") so the
      // comment mark only attaches to the surrounding text — but the
      // search must still resolve and the surrounding marks must apply.
      const docState = buildDocState([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            {
              type: "mention",
              attrs: {
                type: MentionType.User,
                label: "Alice",
                modelId: "00000000-0000-0000-0000-000000000001",
                id: "00000000-0000-0000-0000-000000000002",
              },
            },
            { type: "text", text: ", how are you?" },
          ],
        },
      ]);

      const result = ProsemirrorHelper.applyCommentMarkByText({
        docState,
        anchorText: "Hello @Alice, how",
        commentId: "comment-1",
        userId: "user-1",
      });

      expect(result?.state).toBeInstanceOf(Uint8Array);

      const marks = getCommentMarks(result!.state);
      // Both text nodes flanking the mention should carry the comment mark,
      // confirming the resolved range spans the leaf atom.
      expect(marks.map((m) => m.text)).toEqual(["Hello ", ", how"]);
      expect(marks.every((m) => m.id === "comment-1")).toBe(true);
    });

    it("throws when leaf text is not enabled (sanity check that the mention's leafText is visible to the matcher)", () => {
      // Searching for the bare mention text "@Alice" should now succeed
      // (it does not throw "not found"), proving textBetween surfaces the
      // mention's leafText into the search corpus.
      const docState = buildDocState([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "before " },
            {
              type: "mention",
              attrs: {
                type: MentionType.User,
                label: "Alice",
                modelId: "00000000-0000-0000-0000-000000000003",
                id: "00000000-0000-0000-0000-000000000004",
              },
            },
            { type: "text", text: " after" },
          ],
        },
      ]);

      expect(() =>
        ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "@Alice",
          commentId: "comment-1",
          userId: "user-1",
        })
      ).not.toThrow();
    });

    it("matches across inline marks (plain text ignores formatting)", () => {
      const docState = buildDocState([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "the " },
            {
              type: "text",
              marks: [{ type: "strong" }],
              text: "brown",
            },
            { type: "text", text: " fox" },
          ],
        },
      ]);

      const result = ProsemirrorHelper.applyCommentMarkByText({
        docState,
        anchorText: "the brown fox",
        commentId: "comment-1",
        userId: "user-1",
      });

      expect(result?.state).toBeInstanceOf(Uint8Array);
      const marks = getCommentMarks(result!.state);
      expect(marks.map((m) => m.text).join("")).toBe("the brown fox");
      expect(marks.every((m) => m.id === "comment-1")).toBe(true);
    });

    it("throws ValidationError when anchorText is not found", () => {
      const docState = buildDocState([
        {
          type: "paragraph",
          content: [{ type: "text", text: "hello world" }],
        },
      ]);

      expect(() =>
        ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "nonexistent",
          commentId: "comment-1",
          userId: "user-1",
        })
      ).toThrow(/not found/);
    });

    it("suggests the closest text when anchorText is not found", () => {
      const docState = buildDocState([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Copy all 6 scripts to " },
            {
              type: "text",
              marks: [{ type: "code_inline" }],
              text: "api-documentation/tools/",
            },
          ],
        },
      ]);

      expect(() =>
        ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "Copy all 7 scripts to `api-documentation/tools/`",
          commentId: "comment-1",
          userId: "user-1",
        })
      ).toThrow(
        'the closest text is "Copy all 6 scripts to api-documentation/tools/"'
      );
    });

    it("does not suggest unrelated text when anchorText is not found", () => {
      const docState = buildDocState([
        {
          type: "paragraph",
          content: [{ type: "text", text: "Copy all 6 scripts to tools" }],
        },
      ]);

      expect(() =>
        ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "totally unrelated sentence here",
          commentId: "comment-1",
          userId: "user-1",
        })
      ).toThrow(/^anchorText was not found in the document$/);
    });

    it("does not suggest text when anchorText is very long", () => {
      const text = "lorem ipsum dolor sit amet ".repeat(50);
      const docState = buildDocState([
        {
          type: "paragraph",
          content: [{ type: "text", text }],
        },
      ]);

      expect(() =>
        ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: `${text}and more`,
          commentId: "comment-1",
          userId: "user-1",
        })
      ).toThrow(/^anchorText was not found in the document$/);
    });

    describe("with markdown formatted anchorText", () => {
      // Callers commonly read a document as markdown and then anchor using a
      // substring of it, which does not exist verbatim in the plain text.
      const steps = [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Implementation steps" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Remove " },
            {
              type: "text",
              marks: [{ type: "code_inline" }],
              text: "--tools-dir",
            },
            { type: "text", text: " arguments from the scripts" },
          ],
        },
      ];

      it("matches text containing inline code", () => {
        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState: buildDocState(steps),
          anchorText: "Remove `--tools-dir` arguments from the scripts",
          commentId: "comment-1",
          userId: "user-1",
        });

        const marks = getCommentMarks(result!.state);
        expect(marks.map((m) => m.text).join("")).toBe(
          "Remove --tools-dir arguments from the scripts"
        );
      });

      it("matches text containing emphasis", () => {
        const docState = buildDocState([
          {
            type: "paragraph",
            content: [
              { type: "text", text: "the " },
              { type: "text", marks: [{ type: "strong" }], text: "brown" },
              { type: "text", text: " fox" },
            ],
          },
        ]);

        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "the **brown** fox",
          commentId: "comment-1",
          userId: "user-1",
        });

        const marks = getCommentMarks(result!.state);
        expect(marks.map((m) => m.text).join("")).toBe("the brown fox");
      });

      it("matches text containing a link", () => {
        const docState = buildDocState([
          {
            type: "paragraph",
            content: [
              { type: "text", text: "see " },
              {
                type: "text",
                marks: [{ type: "link", attrs: { href: "https://acme.com" } }],
                text: "the docs",
              },
              { type: "text", text: " for details" },
            ],
          },
        ]);

        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "see [the docs](https://acme.com) for details",
          commentId: "comment-1",
          userId: "user-1",
        });

        const marks = getCommentMarks(result!.state);
        expect(marks.map((m) => m.text).join("")).toBe(
          "see the docs for details"
        );
      });

      it("matches text including a heading marker", () => {
        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState: buildDocState(steps),
          anchorText: "## Implementation steps",
          commentId: "comment-1",
          userId: "user-1",
        });

        const marks = getCommentMarks(result!.state);
        expect(marks.map((m) => m.text).join("")).toBe("Implementation steps");
      });

      it("matches text including a list marker", () => {
        const docState = buildDocState([
          {
            type: "bullet_list",
            content: [
              {
                type: "list_item",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "first item" }],
                  },
                ],
              },
            ],
          },
        ]);

        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "- first item",
          commentId: "comment-1",
          userId: "user-1",
        });

        const marks = getCommentMarks(result!.state);
        expect(marks.map((m) => m.text).join("")).toBe("first item");
      });

      it("matches text that is wrapped over several lines", () => {
        const docState = buildDocState([
          {
            type: "paragraph",
            content: [{ type: "text", text: "The quick brown fox jumps" }],
          },
        ]);

        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "The quick\n  brown fox",
          commentId: "comment-1",
          userId: "user-1",
        });

        const marks = getCommentMarks(result!.state);
        expect(marks.map((m) => m.text).join("")).toBe("The quick brown fox");
      });
    });

    describe("with anchorPrefix and anchorSuffix", () => {
      const fox = [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "the quick brown fox jumps over the lazy fox",
            },
          ],
        },
      ];

      const findMarkedRange = (result: Uint8Array) => {
        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, result);
        const doc = Node.fromJSON(
          schema,
          yDocToProsemirrorJSON(ydoc, "default")
        );

        // Concatenate the doc's plain text and locate the comment-marked
        // span by scanning for marked text nodes. Returns the [start, end]
        // offsets in the plain text.
        let plain = "";
        let start = -1;
        let end = -1;
        doc.descendants((node) => {
          if (node.isText) {
            const len = (node.text ?? "").length;
            const marked = node.marks.some((m) => m.type.name === "comment");
            if (marked) {
              if (start === -1) {
                start = plain.length;
              }
              end = plain.length + len;
            }
            plain += node.text ?? "";
            return false;
          }
          return true;
        });
        return { plain, start, end };
      };

      it("defaults to first occurrence when no prefix or suffix given", () => {
        const docState = buildDocState(fox);
        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "fox",
          commentId: "comment-1",
          userId: "user-1",
        });
        expect(result?.state).toBeInstanceOf(Uint8Array);
        const { plain, start, end } = findMarkedRange(result!.state);
        expect(plain.slice(start, end)).toBe("fox");
        expect(start).toBe(plain.indexOf("fox"));
      });

      it("selects occurrence matching the given prefix", () => {
        const docState = buildDocState(fox);
        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "fox",
          commentId: "comment-1",
          userId: "user-1",
          prefix: "lazy ",
        });
        const { plain, start, end } = findMarkedRange(result!.state);
        expect(plain.slice(start, end)).toBe("fox");
        expect(start).toBe(plain.lastIndexOf("fox"));
      });

      it("selects occurrence matching the given suffix", () => {
        const docState = buildDocState(fox);
        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "fox",
          commentId: "comment-1",
          userId: "user-1",
          suffix: " jumps",
        });
        const { plain, start, end } = findMarkedRange(result!.state);
        expect(plain.slice(start, end)).toBe("fox");
        expect(plain.slice(end, end + 6)).toBe(" jumps");
      });

      it("requires both prefix and suffix to match when both supplied", () => {
        const docState = buildDocState([
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "alpha word beta word gamma word delta",
              },
            ],
          },
        ]);
        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "word",
          commentId: "comment-1",
          userId: "user-1",
          prefix: "beta ",
          suffix: " gamma",
        });
        const { plain, start, end } = findMarkedRange(result!.state);
        expect(plain.slice(start - 5, end + 6)).toBe("beta word gamma");
      });

      it("treats empty prefix and suffix as no constraint", () => {
        const docState = buildDocState(fox);
        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "fox",
          commentId: "comment-1",
          userId: "user-1",
          prefix: "",
          suffix: "",
        });
        const { plain, start } = findMarkedRange(result!.state);
        expect(start).toBe(plain.indexOf("fox"));
      });

      it("matches an occurrence anchored at the start of the document", () => {
        const docState = buildDocState([
          {
            type: "paragraph",
            content: [{ type: "text", text: "fox runs and another fox runs" }],
          },
        ]);
        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "fox",
          commentId: "comment-1",
          userId: "user-1",
          prefix: "",
        });
        const { start } = findMarkedRange(result!.state);
        expect(start).toBe(0);
      });

      it("matches an occurrence anchored at the end of the document", () => {
        const docState = buildDocState([
          {
            type: "paragraph",
            content: [{ type: "text", text: "fox runs and another fox" }],
          },
        ]);
        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "fox",
          commentId: "comment-1",
          userId: "user-1",
          suffix: "",
        });
        const { plain, start } = findMarkedRange(result!.state);
        // With no suffix constraint we still get the first occurrence.
        expect(start).toBe(plain.indexOf("fox"));
      });

      it("disambiguates across multiple top-level blocks via newline", () => {
        const docState = buildDocState([
          {
            type: "paragraph",
            content: [{ type: "text", text: "first fox here" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "second fox here" }],
          },
        ]);
        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "fox",
          commentId: "comment-1",
          userId: "user-1",
          prefix: "second ",
        });
        const { plain, start, end } = findMarkedRange(result!.state);
        expect(plain.slice(start - 7, end)).toBe("second fox");
      });

      it("throws when prefix matches no occurrence", () => {
        const docState = buildDocState(fox);
        expect(() =>
          ProsemirrorHelper.applyCommentMarkByText({
            docState,
            anchorText: "fox",
            commentId: "comment-1",
            userId: "user-1",
            prefix: "purple ",
          })
        ).toThrow(/not found/);
      });

      it("throws when suffix matches no occurrence", () => {
        const docState = buildDocState(fox);
        expect(() =>
          ProsemirrorHelper.applyCommentMarkByText({
            docState,
            anchorText: "fox",
            commentId: "comment-1",
            userId: "user-1",
            suffix: " sleeps",
          })
        ).toThrow(/not found/);
      });

      it("throws when prefix is longer than the text before any occurrence", () => {
        const docState = buildDocState([
          {
            type: "paragraph",
            content: [{ type: "text", text: "fox" }],
          },
        ]);
        // Document has nothing before "fox", so a non-empty prefix can never
        // match — guards against negative-index slice false positives.
        expect(() =>
          ProsemirrorHelper.applyCommentMarkByText({
            docState,
            anchorText: "fox",
            commentId: "comment-1",
            userId: "user-1",
            prefix: "the lazy ",
          })
        ).toThrow(/not found/);
      });

      it("throws when suffix is longer than the text after any occurrence", () => {
        const docState = buildDocState([
          {
            type: "paragraph",
            content: [{ type: "text", text: "the fox" }],
          },
        ]);
        expect(() =>
          ProsemirrorHelper.applyCommentMarkByText({
            docState,
            anchorText: "fox",
            commentId: "comment-1",
            userId: "user-1",
            suffix: " runs fast",
          })
        ).toThrow(/not found/);
      });

      it("considers overlapping candidates when needle can overlap itself", () => {
        // 'aba' matches in 'ababa' at indices 0 and 2 (overlapping). The
        // search must advance one position at a time, not past the previous
        // candidate's end, to reach the second match via prefix.
        const docState = buildDocState([
          {
            type: "paragraph",
            content: [{ type: "text", text: "ababa" }],
          },
        ]);
        const result = ProsemirrorHelper.applyCommentMarkByText({
          docState,
          anchorText: "aba",
          commentId: "comment-1",
          userId: "user-1",
          prefix: "ab",
        });
        const { plain, start, end } = findMarkedRange(result!.state);
        expect(plain.slice(start, end)).toBe("aba");
        expect(start).toBe(2);
      });
    });
  });

  describe("#applyCommentMarkByNode", () => {
    const buildDocState = (content: object[]) => {
      const doc = Node.fromJSON(schema, { type: "doc", content });
      const ydoc = prosemirrorToYDoc(doc, "default");
      return Y.encodeStateAsUpdate(ydoc);
    };

    const image = (src: string, marks: object[] = []) => ({
      type: "paragraph",
      content: [{ type: "image", attrs: { src, marks } }],
    });

    const hashOf = (inlineNode: object) =>
      SharedProsemirrorHelper.getNodeHash(
        Node.fromJSON(schema, {
          type: "doc",
          content: [{ type: "paragraph", content: [inlineNode] }],
        }).firstChild!.firstChild!
      );

    const getImageCommentMarks = (result: Uint8Array) => {
      const ydoc = new Y.Doc();
      Y.applyUpdate(ydoc, result);
      const doc = Node.fromJSON(schema, yDocToProsemirrorJSON(ydoc, "default"));

      const images: { src: string; marks: { attrs: { id: string } }[] }[] = [];
      doc.descendants((node) => {
        if (node.type.name === "image") {
          images.push({
            src: node.attrs.src,
            marks: node.attrs.marks ?? [],
          });
        }
        return true;
      });
      return images;
    };

    it("applies a comment mark to the node's marks attribute", () => {
      const content = image("https://example.com/a.png");
      const docState = buildDocState([content]);

      const result = ProsemirrorHelper.applyCommentMarkByNode({
        docState,
        anchorNodeId: hashOf(content.content[0]),
        commentId: "comment-1",
        userId: "user-1",
      });

      expect(result?.state).toBeInstanceOf(Uint8Array);
      const images = getImageCommentMarks(result!.state);
      expect(images).toHaveLength(1);
      expect(images[0].marks).toHaveLength(1);
      expect(images[0].marks[0]).toEqual({
        type: "comment",
        attrs: {
          id: "comment-1",
          userId: "user-1",
          draft: false,
          resolved: false,
        },
      });
    });

    it("applies to the first occurrence when nodes are identical", () => {
      const content = image("https://example.com/a.png");
      const docState = buildDocState([
        image("https://example.com/a.png"),
        image("https://example.com/a.png"),
      ]);

      const result = ProsemirrorHelper.applyCommentMarkByNode({
        docState,
        anchorNodeId: hashOf(content.content[0]),
        commentId: "comment-1",
        userId: "user-1",
      });

      const images = getImageCommentMarks(result!.state);
      expect(images[0].marks).toHaveLength(1);
      expect(images[1].marks).toHaveLength(0);
    });

    it("matches a node regardless of existing comment marks", () => {
      const existingMark = {
        type: "comment",
        attrs: {
          id: "comment-0",
          userId: "user-1",
          draft: false,
          resolved: false,
        },
      };
      const docState = buildDocState([
        image("https://example.com/a.png", [existingMark]),
      ]);

      const result = ProsemirrorHelper.applyCommentMarkByNode({
        docState,
        // Hash computed without any marks must still match the marked node.
        anchorNodeId: hashOf(image("https://example.com/a.png").content[0]),
        commentId: "comment-1",
        userId: "user-1",
      });

      const images = getImageCommentMarks(result!.state);
      expect(images[0].marks).toHaveLength(2);
      expect(images[0].marks.map((m) => m.attrs.id)).toEqual([
        "comment-0",
        "comment-1",
      ]);
    });

    it("throws when no node matches the hash", () => {
      const docState = buildDocState([image("https://example.com/a.png")]);

      expect(() =>
        ProsemirrorHelper.applyCommentMarkByNode({
          docState,
          anchorNodeId: hashOf(
            image("https://example.com/other.png").content[0]
          ),
          commentId: "comment-1",
          userId: "user-1",
        })
      ).toThrow(/not found/);
    });

    it("throws when the matched node cannot hold comment marks", () => {
      const paragraph = {
        type: "paragraph",
        content: [{ type: "text", text: "plain text" }],
      };
      const docState = buildDocState([paragraph]);
      const hash = SharedProsemirrorHelper.getNodeHash(
        Node.fromJSON(schema, { type: "doc", content: [paragraph] }).firstChild!
      );

      expect(() =>
        ProsemirrorHelper.applyCommentMarkByNode({
          docState,
          anchorNodeId: hash,
          commentId: "comment-1",
          userId: "user-1",
        })
      ).toThrow(/cannot be commented/);
    });
  });
});
