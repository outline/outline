import { generateEmojiNameFromFilename } from "./emoji";

describe("generateEmojiNameFromFilename", () => {
  it("should remove file extension", () => {
    expect(generateEmojiNameFromFilename("happy.png")).toBe("happy");
    expect(generateEmojiNameFromFilename("thinking_face.gif")).toBe(
      "thinking_face"
    );
  });

  it("should convert to lowercase", () => {
    expect(generateEmojiNameFromFilename("Happy.png")).toBe("happy");
    expect(generateEmojiNameFromFilename("PARTY_PARROT.gif")).toBe(
      "party_parrot"
    );
  });

  it("should replace spaces and dashes with underscores", () => {
    expect(generateEmojiNameFromFilename("party parrot.gif")).toBe(
      "party_parrot"
    );
    expect(generateEmojiNameFromFilename("very happy face.png")).toBe(
      "very_happy_face"
    );
  });

  it("should remove invalid characters", () => {
    expect(generateEmojiNameFromFilename("party-parrot.gif")).toBe(
      "party_parrot"
    );
    expect(generateEmojiNameFromFilename("happy!@#$%.png")).toBe("happy");
    expect(generateEmojiNameFromFilename("emoji(1).png")).toBe("emoji");
  });

  it("should remove numbers", () => {
    expect(generateEmojiNameFromFilename("emoji1.png")).toBe("emoji");
    expect(generateEmojiNameFromFilename("test123.gif")).toBe("test");
    expect(generateEmojiNameFromFilename("123emoji.png")).toBe("emoji");
    expect(generateEmojiNameFromFilename("emoji2023.png")).toBe("emoji");
  });

  it("should handle files from slackmojis.com format", () => {
    expect(generateEmojiNameFromFilename("party_parrot.gif")).toBe(
      "party_parrot"
    );
    expect(generateEmojiNameFromFilename("dumpster_fire.png")).toBe(
      "dumpster_fire"
    );
  });

  it("should remove leading and trailing underscores", () => {
    expect(generateEmojiNameFromFilename("_happy_.png")).toBe("happy");
    expect(generateEmojiNameFromFilename("___test___.gif")).toBe("test");
  });

  it("should collapse multiple underscores", () => {
    expect(generateEmojiNameFromFilename("party___parrot.gif")).toBe(
      "party_parrot"
    );
    expect(generateEmojiNameFromFilename("test__emoji.png")).toBe("test_emoji");
  });

  it("should handle complex filenames", () => {
    expect(generateEmojiNameFromFilename("Party Parrot (1).gif")).toBe(
      "party_parrot"
    );
    expect(generateEmojiNameFromFilename("dumpster-fire-2023.png")).toBe(
      "dumpster_fire"
    );
  });

  it("should handle edge cases", () => {
    expect(generateEmojiNameFromFilename("123.png")).toBe("");
    expect(generateEmojiNameFromFilename("_____.png")).toBe("");
    expect(generateEmojiNameFromFilename("a.png")).toBe("a");
  });
});
