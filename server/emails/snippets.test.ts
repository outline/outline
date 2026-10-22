import type { DeepPartial } from "utility-types";
import type { ProsemirrorData } from "@shared/types";
import { MentionType } from "@shared/types";
import { Revision } from "@server/models";
import type { MentionAttrs } from "@server/models/helpers/ProsemirrorHelper";
import { buildProseMirrorDoc } from "@server/test/factories";
import {
  diffSnippet,
  leadingSnippet,
  maxSnippetChars,
  mentionSnippet,
} from "./snippets";

describe("mentionSnippet", () => {
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

    const newDoc = mentionSnippet(doc, mentionAttrs);

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

    const newDoc = mentionSnippet(doc, mentionAttrs);

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

    const newDoc = mentionSnippet(doc, mentionAttrs);

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

    const newDoc = mentionSnippet(doc, mentionAttrs);

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

    const newDoc = mentionSnippet(doc, mentionAttrs);

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

    const newDoc = mentionSnippet(doc, mentionAttrs);

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

    const newDoc = mentionSnippet(doc, mentionAttrs);

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
                text: "x".repeat(maxSnippetChars + 1),
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

    const newDoc = mentionSnippet(doc, mentionAttrs);

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

    const newDoc = mentionSnippet(doc, mentionAttrs);

    expect(newDoc).toBeUndefined();
  });
});

describe("leadingSnippet", () => {
  const paragraph = (text: string) => ({
    type: "paragraph",
    content: [{ type: "text", text }],
  });

  it("should return the first blocks and skip empty paragraphs", () => {
    const doc = buildProseMirrorDoc([
      { type: "paragraph" },
      paragraph("one"),
      paragraph("two"),
      { type: "paragraph" },
      paragraph("three"),
      paragraph("four"),
    ]);

    const newDoc = leadingSnippet(doc);

    expect(newDoc?.toJSON()).toEqual(
      buildProseMirrorDoc([
        paragraph("one"),
        paragraph("two"),
        paragraph("three"),
      ]).toJSON()
    );
  });

  it("should stop before a block that overflows the budget", () => {
    const doc = buildProseMirrorDoc([
      paragraph("one"),
      paragraph("a".repeat(maxSnippetChars)),
    ]);

    const newDoc = leadingSnippet(doc);

    expect(newDoc?.toJSON()).toEqual(
      buildProseMirrorDoc([paragraph("one")]).toJSON()
    );
  });

  it("should keep an overflowing first block", () => {
    const long = paragraph("a".repeat(maxSnippetChars));
    const doc = buildProseMirrorDoc([long, paragraph("two")]);

    const newDoc = leadingSnippet(doc);

    expect(newDoc?.toJSON()).toEqual(buildProseMirrorDoc([long]).toJSON());
  });

  it("should trim an overflowing list to its leading items", () => {
    const half = maxSnippetChars / 2;
    const item = (text: string) => ({
      type: "list_item",
      content: [paragraph(text)],
    });
    const doc = buildProseMirrorDoc([
      {
        type: "bullet_list",
        content: [
          item("a".repeat(half - 1)),
          item("b".repeat(half - 1)),
          item("c".repeat(half - 1)),
        ],
      },
      paragraph("after"),
    ]);

    const newDoc = leadingSnippet(doc);

    expect(newDoc?.toJSON()).toEqual(
      buildProseMirrorDoc([
        {
          type: "bullet_list",
          content: [item("a".repeat(half - 1)), item("b".repeat(half - 1))],
        },
      ]).toJSON()
    );
  });

  it("should return undefined for an empty document", () => {
    const doc = buildProseMirrorDoc([{ type: "paragraph" }]);

    expect(leadingSnippet(doc)).toBeUndefined();
  });

  describe("with lists", () => {
    const item = (text?: string) => ({
      type: "list_item",
      content: [text ? paragraph(text) : { type: "paragraph" }],
    });
    const list = (items: ReturnType<typeof item>[]) => ({
      type: "bullet_list",
      content: items,
    });

    it("should not add a list whose first item overflows the remaining budget", () => {
      const first = paragraph("a".repeat(maxSnippetChars - 100));
      const doc = buildProseMirrorDoc([first, list([item("b".repeat(500))])]);

      const newDoc = leadingSnippet(doc);

      expect(newDoc?.toJSON()).toEqual(buildProseMirrorDoc([first]).toJSON());
    });

    it("should count the separators between list items", () => {
      const items = Array.from({ length: 10 }, () => item("a".repeat(100)));
      const doc = buildProseMirrorDoc([list(items)]);

      const newDoc = leadingSnippet(doc);

      expect(newDoc?.toJSON()).toEqual(
        buildProseMirrorDoc([list(items.slice(0, 9))]).toJSON()
      );
    });

    it("should limit the number of short list items", () => {
      const items = Array.from({ length: 600 }, () => item("a"));
      const doc = buildProseMirrorDoc([list(items)]);

      const newDoc = leadingSnippet(doc);

      expect(newDoc?.firstChild?.childCount).toEqual(10);
    });

    it("should limit the number of empty list items", () => {
      const items = Array.from({ length: 600 }, () => item());
      const doc = buildProseMirrorDoc([list(items)]);

      const newDoc = leadingSnippet(doc);

      expect(newDoc?.firstChild?.childCount).toEqual(10);
    });
  });
});

describe("diffSnippet", () => {
  it("should render a compact diff", async () => {
    const before = new Revision({
      title: "Title",
      text: `
This is a test paragraph

- list item 1
- list item 2

:::info
Content in an info block
:::

!!This is a placeholder!!

==this is a highlight==

- [ ] checklist item 1
- [ ] checklist item 2
- [x] checklist item 3

same on both sides

same on both sides

same on both sides`,
    });

    const after = new Revision({
      title: "Title",
      text: `
This is a test paragraph

A new paragraph

- list item 1
- list item 2

This is a new paragraph.

!!This is a placeholder!!

==this is a highlight==

- [x] checklist item 1
- [x] checklist item 2
- [ ] checklist item 3
- [ ] checklist item 4
- [x] checklist item 5

same on both sides

same on both sides

same on both sides`,
    });

    const html = await diffSnippet(before, after);

    // marks breaks in diff
    expect(html).toContain("diff-context-break");

    // changed list
    expect(html).toContain("checklist item 1");
    expect(html).toContain("checklist item 5");

    // added
    expect(html).toContain("A new paragraph");

    // Retained for context above added paragraph
    expect(html).toContain("This is a test paragraph");

    // removed
    expect(html).toContain("Content in an info block");

    // unchanged
    expect(html).not.toContain("same on both sides");
    expect(html).not.toContain("this is a highlight");
  });

  it("should render diff for mark changes", async () => {
    const before = new Revision({
      title: "Title",
      text: `
This is a test paragraph`,
    });

    const after = new Revision({
      title: "Title",
      text: `
This is a [test paragraph](https://example.net)`,
    });

    const html = await diffSnippet(before, after);
    expect(html).toBeDefined();
  });

  it("should return undefined if no diff is detected", async () => {
    const before = new Revision({
      title: "Title",
      text: "Same text",
    });

    const after = new Revision({
      title: "Title",
      text: "Same text",
    });

    const html = await diffSnippet(before, after);
    expect(html).toBeUndefined();
  });

  it("should trim table rows to show minimal diff including header", async () => {
    const before = new Revision({
      title: "Title",
      text: `
| Syntax      | Description |
| ----------- | ----------- |
| Header      | Title       |
| Paragraph   | Text        |
| Content     | Another     |
| More        | Content     |
| Long        | Table       |`,
    });

    const after = new Revision({
      title: "Title",
      text: `
| Syntax      | Description |
| ----------- | ----------- |
| Header      | Title       |
| Paragraph   | Text        |
| Content     | Changed     |
| More        | Content     |
| Long        | Table       |`,
    });

    const html = await diffSnippet(before, after);

    expect(html).toContain("Changed");
    expect(html).not.toContain("Long");
  });
});
