import type { ProsemirrorData } from "../../types";
import {
  getNameFromEmoji,
  getEmojiFromName,
  loadEmojiData,
  parseReactionShorthand,
} from "./emoji";

beforeAll(async () => {
  await loadEmojiData();
});

describe("getNameFromEmoji", () => {
  it("returns the correct shortcode", () => {
    expect(getNameFromEmoji("🤔")).toBe("thinking_face");
  });
});

describe("getEmojiFromName", () => {
  it("returns the correct native character", () => {
    expect(getEmojiFromName("thinking_face")).toBe("🤔");
  });
});

describe("parseReactionShorthand", () => {
  const doc = (content: ProsemirrorData[]): ProsemirrorData => ({
    type: "doc",
    content,
  });

  const paragraph = (content: ProsemirrorData[]): ProsemirrorData => ({
    type: "paragraph",
    content,
  });

  const text = (value: string): ProsemirrorData => ({
    type: "text",
    text: value,
  });

  const emoji = (name: string): ProsemirrorData => ({
    type: "emoji",
    attrs: { "data-name": name },
  });

  it("resolves a '+' followed by an emoji node", () => {
    expect(
      parseReactionShorthand(doc([paragraph([text("+"), emoji("thumbs_up")])]))
    ).toBe("👍");
  });

  it("ignores whitespace between the '+' and the emoji node", () => {
    expect(
      parseReactionShorthand(
        doc([paragraph([text("+"), text(" "), emoji("thinking_face")])])
      )
    ).toBe("🤔");
  });

  it("resolves a custom emoji UUID to its UUID", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(
      parseReactionShorthand(doc([paragraph([text("+"), emoji(uuid)])]))
    ).toBe(uuid);
  });

  it("resolves literal '+:shortcode:' text", () => {
    expect(
      parseReactionShorthand(doc([paragraph([text("+:thinking_face:")])]))
    ).toBe("🤔");
  });

  it("returns undefined for an unknown shortcode", () => {
    expect(
      parseReactionShorthand(
        doc([paragraph([text("+"), emoji("not_an_emoji")])])
      )
    ).toBeUndefined();
  });

  it("returns undefined when there is text alongside the emoji", () => {
    expect(
      parseReactionShorthand(
        doc([paragraph([text("+ nice "), emoji("thumbs_up")])])
      )
    ).toBeUndefined();
  });

  it("returns undefined for a regular comment", () => {
    expect(
      parseReactionShorthand(doc([paragraph([text("Looks good to me")])]))
    ).toBeUndefined();
  });

  it("returns undefined when the '+' prefix is missing", () => {
    expect(
      parseReactionShorthand(doc([paragraph([emoji("thumbs_up")])]))
    ).toBeUndefined();
  });

  it("returns undefined for multiple paragraphs", () => {
    expect(
      parseReactionShorthand(
        doc([
          paragraph([text("+"), emoji("thumbs_up")]),
          paragraph([text("more")]),
        ])
      )
    ).toBeUndefined();
  });
});
