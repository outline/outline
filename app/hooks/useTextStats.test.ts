import { getTextStats } from "./useTextStats";

describe("getTextStats", () => {
  it("counts words, characters and paragraphs", () => {
    const stats = getTextStats("Hello world\nSecond paragraph here");

    expect(stats.words).toBe(5);
    expect(stats.characters).toBe(33);
    expect(stats.paragraphs).toBe(2);
  });

  it("ignores empty lines when counting paragraphs", () => {
    const stats = getTextStats("One\n\n  \nTwo\n");

    expect(stats.paragraphs).toBe(2);
  });

  it("returns zeroed stats for empty text", () => {
    const stats = getTextStats("");

    expect(stats.words).toBe(0);
    expect(stats.characters).toBe(0);
    expect(stats.paragraphs).toBe(0);
    expect(stats.readingTime).toBe(0);
  });

  it("rounds reading time up to a minute for short text", () => {
    expect(getTextStats("Hello world").readingTime).toBe(1);
  });

  it("rounds reading time up to the next minute for long text", () => {
    expect(getTextStats("word ".repeat(500)).readingTime).toBe(3);
    expect(getTextStats("word ".repeat(400)).readingTime).toBe(2);
  });
});
