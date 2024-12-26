import Revision from "@server/models/Revision";
import { buildDocument } from "@server/test/factories";
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
  });

  describe("toJSON", () => {
    it("should return content directly if no transformation required", async () => {
      const document = await buildDocument();
      const result = await DocumentHelper.toJSON(document);
      expect(result === document.content).toBe(true);
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

    it("should return undefined if no diff is renderable", async () => {
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

      // Note: This test may fail in the future when support for diffing marks
      // is improved.
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
