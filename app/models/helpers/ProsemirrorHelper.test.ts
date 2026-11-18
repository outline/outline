import type { ProsemirrorData } from "@shared/types";
import { ProsemirrorHelper } from "./ProsemirrorHelper";

const paragraph = (content: ProsemirrorData[]): ProsemirrorData => ({
  type: "paragraph",
  content,
});

const doc = (content: ProsemirrorData[]): ProsemirrorData => ({
  type: "doc",
  content,
});

const render = (data: ProsemirrorData) => {
  const node = ProsemirrorHelper.toStaticNode(data);
  if (!node) {
    return undefined;
  }
  return ProsemirrorHelper.toHTML(node);
};

describe("ProsemirrorHelper", () => {
  describe("toStaticNode", () => {
    it("should render marks, hard breaks and lists", () => {
      const html = render(
        doc([
          paragraph([
            { type: "text", text: "bold", marks: [{ type: "strong" }] },
            { type: "br" },
            { type: "emoji", attrs: { "data-name": "smile" } },
          ]),
          {
            type: "bullet_list",
            content: [
              {
                type: "list_item",
                content: [paragraph([{ type: "text", text: "item" }])],
              },
            ],
          },
        ])
      );

      expect(html).toContain("<strong>bold</strong>");
      expect(html).toContain("<br>");
      expect(html).toContain('class="emoji smile"');
      expect(html).toContain('<ul><li><p dir="auto">item</p></li></ul>');
    });

    it("should render an empty paragraph", () => {
      expect(render(doc([{ type: "paragraph" }]))).toBe('<p dir="auto"></p>');
    });

    it("should return undefined for mentions", () => {
      expect(
        render(
          doc([
            paragraph([
              {
                type: "mention",
                attrs: { type: "user", modelId: "1", label: "Tom", id: "1" },
              },
            ]),
          ])
        )
      ).toBeUndefined();
    });

    it("should return undefined for custom emoji", () => {
      expect(
        render(
          doc([
            paragraph([
              {
                type: "emoji",
                attrs: { "data-name": "7a1f7a2e-2b1e-4c3d-9f4a-1b2c3d4e5f60" },
              },
            ]),
          ])
        )
      ).toBeUndefined();
    });

    it("should return undefined for code blocks and images", () => {
      expect(
        render(doc([{ type: "code_fence", attrs: { language: "js" } }]))
      ).toBeUndefined();
      expect(
        render(doc([{ type: "image", attrs: { src: "/x.png" } }]))
      ).toBeUndefined();
    });

    it("should return undefined for links", () => {
      expect(
        render(
          doc([
            paragraph([
              {
                type: "text",
                text: "link",
                marks: [
                  { type: "link", attrs: { href: "https://example.com" } },
                ],
              },
            ]),
          ])
        )
      ).toBeUndefined();
    });

    it("should return undefined for inline code", () => {
      expect(
        render(
          doc([
            paragraph([
              { type: "text", text: "#fff", marks: [{ type: "code_inline" }] },
            ]),
          ])
        )
      ).toBeUndefined();
    });

    it("should return undefined for comment marks", () => {
      expect(
        render(
          doc([
            paragraph([
              {
                type: "text",
                text: "hi",
                marks: [{ type: "comment", attrs: { id: "c1", userId: "u" } }],
              },
            ]),
          ])
        )
      ).toBeUndefined();
    });

    it("should return undefined for invalid data", () => {
      expect(render(doc([paragraph([{ type: "text" }])]))).toBeUndefined();
    });
  });
});
