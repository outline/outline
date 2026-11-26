import type { Emoji as RawEmoji } from "@emoji-mart/data";
import { getEmojiId, getEmojiSearchString, search } from "./emoji";

const emoji = (overrides: Partial<RawEmoji>): RawEmoji => ({
  id: "id",
  name: "Name",
  keywords: [],
  skins: [{ unified: "1f600", native: "😀" }],
  version: 1,
  ...overrides,
});

describe("getEmojiSearchString", () => {
  it("includes the id, name words, keywords, emoticons and natives in order", () => {
    expect(
      getEmojiSearchString(
        emoji({
          id: "grinning",
          name: "Grinning Face",
          keywords: ["smile", "happy", ":D"],
          emoticons: [":D"],
        })
      )
    ).toBe(",grinning,grinning,face,smile,happy,:d,:d,😀");
  });

  it("includes the native of every skin", () => {
    expect(
      getEmojiSearchString(
        emoji({
          id: "wave",
          name: "Waving Hand",
          skins: [
            { unified: "1f44b", native: "👋" },
            { unified: "1f44b-1f3fb", native: "👋🏻" },
          ],
        })
      )
    ).toBe(",wave,waving,hand,👋,👋🏻");
  });

  it("splits the name on hyphens, underscores, pipes and whitespace", () => {
    expect(getEmojiSearchString(emoji({ name: "A-b_c|d  E" }))).toBe(
      ",id,a,b,c,d,e,😀"
    );
  });

  it("removes empty terms", () => {
    expect(
      getEmojiSearchString(emoji({ name: "-Name-", keywords: ["", " "] }))
    ).toBe(",id,name,😀");
  });
});

describe("search", () => {
  it("finds an emoji by keyword", () => {
    const ids = search({ query: "smile" }).map(({ id }) => id);
    expect(ids).toContain("grinning");
  });

  it("finds an emoji by emoticon", () => {
    const ids = search({ query: ":D" }).map(({ id }) => id);
    expect(ids).toContain("grinning");
  });
});

describe("getEmojiId", () => {
  it("finds the id from the native emoji", () => {
    expect(getEmojiId("😀")).toBe("grinning");
  });

  it("finds the id from a skin variant", () => {
    expect(getEmojiId("👋🏻")).toBe("wave");
  });
});
