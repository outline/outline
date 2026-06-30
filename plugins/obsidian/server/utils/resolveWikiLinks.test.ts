import { MentionType } from "@shared/types";
import type { ProsemirrorData } from "@shared/types";
import { resolveWikiLinks } from "./resolveWikiLinks";

const options = {
  resolveDocument: (target: string) =>
    target === "Target Note" ? "doc-external-id" : undefined,
  resolveAttachment: (target: string) =>
    target === "image.png" ? "/api/attachments.redirect?id=att-id" : undefined,
};

const paragraph = (...content: ProsemirrorData[]): ProsemirrorData => ({
  type: "doc",
  content: [{ type: "paragraph", content }],
});

const firstInline = (doc: ProsemirrorData) => doc.content?.[0].content?.[0];

describe("resolveWikiLinks", () => {
  it("rewrites a resolved document mention's modelId to the externalId", () => {
    const result = resolveWikiLinks(
      paragraph({
        type: "mention",
        attrs: {
          id: "uuid",
          type: MentionType.Document,
          modelId: "Target Note",
          label: "Target Note",
        },
      }),
      options
    );

    expect(firstInline(result)).toMatchObject({
      type: "mention",
      attrs: { modelId: "doc-external-id", label: "Target Note" },
    });
  });

  it("demotes an unresolved document mention to plain text", () => {
    const result = resolveWikiLinks(
      paragraph({
        type: "mention",
        attrs: {
          id: "uuid",
          type: MentionType.Document,
          modelId: "Missing Note",
          label: "shown label",
        },
      }),
      options
    );

    expect(firstInline(result)).toEqual({ type: "text", text: "shown label" });
  });

  it("rewrites a matching image src to the attachment href", () => {
    const result = resolveWikiLinks(
      paragraph({ type: "image", attrs: { src: "image.png", alt: "img" } }),
      options
    );

    expect(firstInline(result)).toMatchObject({
      type: "image",
      attrs: { src: "/api/attachments.redirect?id=att-id", alt: "img" },
    });
  });

  it("leaves a non-matching image src untouched", () => {
    const result = resolveWikiLinks(
      paragraph({
        type: "image",
        attrs: { src: "https://example.com/real.png" },
      }),
      options
    );

    expect(firstInline(result)).toMatchObject({
      type: "image",
      attrs: { src: "https://example.com/real.png" },
    });
  });

  it("rewrites a matching link mark href on text", () => {
    const result = resolveWikiLinks(
      paragraph({
        type: "text",
        text: "image.png",
        marks: [{ type: "link", attrs: { href: "image.png" } }],
      }),
      options
    );

    expect(firstInline(result)?.marks?.[0]).toMatchObject({
      type: "link",
      attrs: { href: "/api/attachments.redirect?id=att-id" },
    });
  });

  it("leaves real mentions and links untouched", () => {
    const result = resolveWikiLinks(
      paragraph({
        type: "text",
        text: "external",
        marks: [{ type: "link", attrs: { href: "https://example.com" } }],
      }),
      options
    );

    expect(firstInline(result)?.marks?.[0]).toMatchObject({
      type: "link",
      attrs: { href: "https://example.com" },
    });
  });
});
