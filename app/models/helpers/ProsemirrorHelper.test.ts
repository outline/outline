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

const heading = (text: string, level: number): ProsemirrorData => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
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

  describe("getHeadingTitle", () => {
    it("finds the heading that an anchor points at", () => {
      expect(
        ProsemirrorHelper.getHeadingTitle(
          { data: doc([heading("Q3 goals", 2)]) },
          "h-q3-goals"
        )
      ).toBe("Q3 goals");
    });

    it("finds a heading through the percent encoding a url puts on its anchor", () => {
      expect(
        ProsemirrorHelper.getHeadingTitle(
          { data: doc([heading("\u306b\u307b\u3093\u3054", 2)]) },
          "h-%E3%81%AB%E3%81%BB%E3%82%93%E3%81%94"
        )
      ).toBe("\u306b\u307b\u3093\u3054");
    });

    it("returns undefined when the heading no longer exists", () => {
      expect(
        ProsemirrorHelper.getHeadingTitle(
          { data: doc([heading("Q4 goals", 2)]) },
          "h-q3-goals"
        )
      ).toBeUndefined();
    });

    it("distinguishes repeated headings by the suffix on their anchor", () => {
      const repeated = {
        data: doc([
          heading("Goals", 2),
          heading("Timeline", 2),
          heading("Goals", 3),
        ]),
      };

      expect(ProsemirrorHelper.getHeadingTitle(repeated, "h-goals-1")).toBe(
        "Goals"
      );
      expect(
        ProsemirrorHelper.getHeadingTitle(repeated, "h-goals-2")
      ).toBeUndefined();
    });
  });
});
