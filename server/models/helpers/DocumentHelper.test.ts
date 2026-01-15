import Revision from "@server/models/Revision";
import { buildCollection, buildDocument } from "@server/test/factories";
import { ChangesetHelper } from "@shared/editor/lib/ChangesetHelper";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { DocumentHelper } from "./DocumentHelper";

describe("DocumentHelper", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.parse("2021-01-01T00:00:00.000Z"));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("replaceInternalUrls", () => {
    it("should replace internal urls", async () => {
      const document = await buildDocument({
        text: `[link](/doc/internal-123)`,
      });
      const result = await DocumentHelper.toJSON(document, {
        internalUrlBase: "/s/share-123",
      });
      expect(result).toEqual({
        content: [
          {
            content: [
              {
                marks: [
                  {
                    attrs: {
                      href: "/s/share-123/doc/internal-123",
                      title: null,
                    },
                    type: "link",
                  },
                ],
                text: "link",
                type: "text",
              },
            ],
            type: "paragraph",
          },
        ],
        type: "doc",
      });
    });

    it("should not duplicate share path for URLs that already contain it", async () => {
      const document = await buildDocument({
        text: `[link](/s/testbugpage001/doc/test-page-2-2xIDEXYlib)`,
      });
      const result = await DocumentHelper.toJSON(document, {
        internalUrlBase: "/s/testbugpage001",
      });
      expect(result).toEqual({
        content: [
          {
            content: [
              {
                marks: [
                  {
                    attrs: {
                      href: "/s/testbugpage001/doc/test-page-2-2xIDEXYlib",
                      title: null,
                    },
                    type: "link",
                  },
                ],
                text: "link",
                type: "text",
              },
            ],
            type: "paragraph",
          },
        ],
        type: "doc",
      });
    });
  });

  describe("toJSON", () => {
    it("should return content directly if no transformation required", async () => {
      const document = await buildDocument();
      const result = await DocumentHelper.toJSON(document);
      expect(result === document.content).toBe(true);
    });
  });

  describe("toHTML", () => {
    it("should return html", async () => {
      const document = await buildDocument({
        text: "This is a test paragraph",
      });
      const result = await DocumentHelper.toHTML(document, {
        includeTitle: false,
        includeStyles: false,
      });
      expect(result).toContain('<p dir="auto">This is a test paragraph</p>');
    });

    it("should render diff classes when changes provided", async () => {
      const doc1 = await buildDocument({ text: "Hello world" });
      const doc2 = await buildDocument({ text: "Hello modified world" });

      const changeset = ChangesetHelper.getChangeset(
        doc2.content,
        doc1.content
      );

      expect(changeset).not.toBeNull();

      const result = await DocumentHelper.toHTML(doc2, {
        includeTitle: false,
        includeStyles: false,
        changes: changeset!.changes,
      });

      expect(result).toContain(EditorStyleHelper.diffInsertion);
    });
  });

  describe("diff", () => {
    it("should return html with diff", async () => {
      const doc1 = await buildDocument({ text: "Hello world" });
      const doc2 = await buildDocument({ text: "Hello modified world" });
      const revision = new Revision({
        documentId: doc2.id,
        title: doc2.title,
        text: doc2.text,
      });

      const result = await DocumentHelper.diff(doc1, revision, {
        includeTitle: false,
        includeStyles: false,
      });

      expect(result).toContain(EditorStyleHelper.diffInsertion);
    });
  });

  describe("parseMentions", () => {
    it("should not parse normal links as mentions", async () => {
      const document = await buildDocument({
        text: `# Header

[link not mention](http://google.com)`,
      });
      const result = DocumentHelper.parseMentions(document);
      expect(result.length).toBe(0);
    });

    it("should return an array of mentions", async () => {
      const document = await buildDocument({
        text: `# Header

@[Alan Kay](mention://2767ba0e-ac5c-4533-b9cf-4f5fc456600e/user/34095ac1-c808-45c0-8c6e-6c554497de64) :wink:

More text

@[Bret Victor](mention://34095ac1-c808-45c0-8c6e-6c554497de64/user/2767ba0e-ac5c-4533-b9cf-4f5fc456600e) :fire:`,
      });
      const result = DocumentHelper.parseMentions(document);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe("2767ba0e-ac5c-4533-b9cf-4f5fc456600e");
      expect(result[1].id).toBe("34095ac1-c808-45c0-8c6e-6c554497de64");
      expect(result[0].modelId).toBe("34095ac1-c808-45c0-8c6e-6c554497de64");
      expect(result[1].modelId).toBe("2767ba0e-ac5c-4533-b9cf-4f5fc456600e");
    });
  });

  describe("toEmailDiff", () => {
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

      const html = await DocumentHelper.toEmailDiff(before, after);

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

      const html = await DocumentHelper.toEmailDiff(before, after);
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

      const html = await DocumentHelper.toEmailDiff(before, after);
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

      const html = await DocumentHelper.toEmailDiff(before, after);

      expect(html).toContain("Changed");
      expect(html).not.toContain("Long");
    });
  });

  describe("toMarkdown", () => {
    it("should export bullet lists inside table cells with br tags", async () => {
      // Create a document with a table containing a bullet list in a cell
      // This tests the renderList inTable handling
      const document = await buildDocument({
        content: {
          type: "doc",
          content: [
            {
              type: "table",
              content: [
                {
                  type: "tr",
                  content: [
                    {
                      type: "th",
                      attrs: { colspan: 1, rowspan: 1 },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Header" }],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "tr",
                  content: [
                    {
                      type: "td",
                      attrs: { colspan: 1, rowspan: 1 },
                      content: [
                        {
                          type: "bullet_list",
                          content: [
                            {
                              type: "list_item",
                              content: [
                                {
                                  type: "paragraph",
                                  content: [{ type: "text", text: "item 1" }],
                                },
                              ],
                            },
                            {
                              type: "list_item",
                              content: [
                                {
                                  type: "paragraph",
                                  content: [{ type: "text", text: "item 2" }],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
      const result = await DocumentHelper.toMarkdown(document, {
        includeTitle: false,
      });
      // Lists inside tables should use <br> tags instead of newlines
      expect(result).toContain("<br>");
      expect(result).toContain("* item 1");
      expect(result).toContain("* item 2");
      // Should not have newlines between list items within the table cell
      expect(result).not.toMatch(/\* item 1\n\* item 2/);
    });

    it("should export ordered lists inside table cells with br tags", async () => {
      const document = await buildDocument({
        content: {
          type: "doc",
          content: [
            {
              type: "table",
              content: [
                {
                  type: "tr",
                  content: [
                    {
                      type: "th",
                      attrs: { colspan: 1, rowspan: 1 },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Header" }],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "tr",
                  content: [
                    {
                      type: "td",
                      attrs: { colspan: 1, rowspan: 1 },
                      content: [
                        {
                          type: "ordered_list",
                          attrs: { order: 1 },
                          content: [
                            {
                              type: "list_item",
                              content: [
                                {
                                  type: "paragraph",
                                  content: [{ type: "text", text: "first" }],
                                },
                              ],
                            },
                            {
                              type: "list_item",
                              content: [
                                {
                                  type: "paragraph",
                                  content: [{ type: "text", text: "second" }],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
      const result = await DocumentHelper.toMarkdown(document, {
        includeTitle: false,
      });
      // Ordered lists inside tables should use <br> tags
      expect(result).toContain("<br>");
      expect(result).toContain("1. first");
      expect(result).toContain("2. second");
    });

    it("should pad table cells to match header width", async () => {
      const document = await buildDocument({
        content: {
          type: "doc",
          content: [
            {
              type: "table",
              content: [
                {
                  type: "tr",
                  content: [
                    {
                      type: "th",
                      attrs: { colspan: 1, rowspan: 1 },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Long Header" }],
                        },
                      ],
                    },
                    {
                      type: "th",
                      attrs: { colspan: 1, rowspan: 1 },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Col 2" }],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "tr",
                  content: [
                    {
                      type: "td",
                      attrs: { colspan: 1, rowspan: 1 },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "A" }],
                        },
                      ],
                    },
                    {
                      type: "td",
                      attrs: { colspan: 1, rowspan: 1 },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "B" }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
      const result = await DocumentHelper.toMarkdown(document, {
        includeTitle: false,
      });
      // Cells should be padded to match header width
      // "A" padded to 11 chars (length of "Long Header")
      // "B" padded to 5 chars (length of "Col 2")
      expect(result).toContain("| A           |"); // A + 10 spaces = 11 chars
      expect(result).toContain("| B     |"); // B + 4 spaces = 5 chars
    });

    it("should export checkbox lists inside table cells with br tags", async () => {
      const document = await buildDocument({
        content: {
          type: "doc",
          content: [
            {
              type: "table",
              content: [
                {
                  type: "tr",
                  content: [
                    {
                      type: "th",
                      attrs: { colspan: 1, rowspan: 1 },
                      content: [
                        {
                          type: "paragraph",
                          content: [{ type: "text", text: "Header" }],
                        },
                      ],
                    },
                  ],
                },
                {
                  type: "tr",
                  content: [
                    {
                      type: "td",
                      attrs: { colspan: 1, rowspan: 1 },
                      content: [
                        {
                          type: "checkbox_list",
                          content: [
                            {
                              type: "checkbox_item",
                              attrs: { checked: false },
                              content: [
                                {
                                  type: "paragraph",
                                  content: [{ type: "text", text: "todo" }],
                                },
                              ],
                            },
                            {
                              type: "checkbox_item",
                              attrs: { checked: true },
                              content: [
                                {
                                  type: "paragraph",
                                  content: [{ type: "text", text: "done" }],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      });
      const result = await DocumentHelper.toMarkdown(document, {
        includeTitle: false,
      });
      // Checkbox lists inside tables should use <br> tags
      expect(result).toContain("<br>");
      expect(result).toContain("[ ] todo");
      expect(result).toContain("[x] done");
    });

    it("should include collection title by default", async () => {
      const collection = await buildCollection({
        name: "Test Collection",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Collection description" }],
            },
          ],
        },
      });
      const result = await DocumentHelper.toMarkdown(collection);
      expect(result).toContain("# Test Collection");
      expect(result).toContain("Collection description");
    });

    it("should include collection emoji icon in title", async () => {
      const collection = await buildCollection({
        name: "Test Collection",
        icon: "📚",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Collection description" }],
            },
          ],
        },
      });
      const result = await DocumentHelper.toMarkdown(collection);
      expect(result).toContain("# 📚 Test Collection");
    });

    it("should not include collection title when includeTitle is false", async () => {
      const collection = await buildCollection({
        name: "Test Collection",
        icon: "📚",
        content: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Collection description" }],
            },
          ],
        },
      });
      const result = await DocumentHelper.toMarkdown(collection, {
        includeTitle: false,
      });
      expect(result).not.toContain("# ");
      expect(result).not.toContain("Test Collection");
      expect(result).toContain("Collection description");
    });
  });

  describe("toPlainText", () => {
    it("should return only plain text", async () => {
      const revision = new Revision({
        title: "Title",
        text: `
This is a test paragraph

A new [link](https://www.google.com)

- list item 1

This is a new paragraph.

!!This is a placeholder!!

==this is a highlight==

- [x] checklist item 1
- [x] checklist item 2
- [ ] checklist item 3
- [ ] checklist item 4
- [x] checklist item 5

| This | Is | Table |
|----|----|----|
| Multiple \n Lines \n In a cell |    |    |
|    |    |    |`,
      });

      const text = DocumentHelper.toPlainText(revision);

      // Strip all formatting
      expect(text).toEqual(`This is a test paragraph
A new link
list item 1
This is a new paragraph.
This is a placeholder
this is a highlight
checklist item 1
checklist item 2
checklist item 3
checklist item 4
checklist item 5
This
Is
Table
Multiple


Lines


In a cell




`);
    });
  });
});
