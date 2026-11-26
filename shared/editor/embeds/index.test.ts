import embeds from ".";

const match = (id: string, url: string) => {
  const embed = embeds.find((e) => e.id === id);
  if (!embed) {
    throw new Error(`Embed ${id} not found`);
  }
  return embed.matcher(url);
};

describe("embed regexes", () => {
  it("should match InVision URLs", () => {
    expect(match("invision", "https://invis.io/R8ABCDEF")).toBeTruthy();
    expect(
      match("invision", "https://projects.invisionapp.com/share/ABC123")
    ).toBeTruthy();
  });

  it("should not match InVision paths on other hosts", () => {
    expect(
      match("invision", "https://evil.example/projects.invisionapp.com/share/x")
    ).toBe(false);
  });

  it("should match Vimeo URLs", () => {
    const result = match("vimeo", "https://vimeo.com/123456789/abcdef1234");
    expect(result && result[4]).toBe("123456789");
    expect(result && result[5]).toBe("abcdef1234");
  });

  it("should not match Vimeo URLs inside other URLs", () => {
    expect(
      match("vimeo", "https://evil.example/?u=https://vimeo.com/123")
    ).toBe(false);
  });

  it("should match YouTube URLs", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    ]) {
      const result = match("youtube", url);
      expect(result && result[1]).toBe("dQw4w9WgXcQ");
    }
  });

  it("should not match YouTube lookalike URLs", () => {
    expect(
      match("youtube", "https://blog.example.com/youtube/how-to-film")
    ).toBe(false);
    expect(
      match("youtube", "https://youtube.evil.example/watch?v=dQw4w9WgXcQ")
    ).toBe(false);
  });

  it("should match PlantUML URLs", () => {
    expect(
      match(
        "plant-uml",
        "https://editor.plantuml.com/uml/SoWkIImgAStDuNBAJrBGjLDmpCbCJbMmKiX8pSd9vt98pKi1IW80"
      )
    ).toBeTruthy();
  });

  it("should not match PlantUML paths on other hosts", () => {
    expect(
      match("plant-uml", "https://evil.example/editor.plantuml.com/uml/abc")
    ).toBe(false);
  });
});
