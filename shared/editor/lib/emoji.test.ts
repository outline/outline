import { getNameFromEmoji, getEmojiFromName } from "./emoji";

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
