import { convertBareUrlsToEmbedMarkdown } from "./embedHelper";

describe("embedHelper", () => {
  describe("convertBareUrlsToEmbedMarkdown", () => {
    it("should convert bare YouTube URL to embed format", () => {
      const input = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      const expected =
        "[https://www.youtube.com/watch?v=dQw4w9WgXcQ](https://www.youtube.com/watch?v=dQw4w9WgXcQ)";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(expected);
    });

    it("should convert bare Vimeo URL to embed format", () => {
      const input = "https://vimeo.com/123456789";
      const expected =
        "[https://vimeo.com/123456789](https://vimeo.com/123456789)";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(expected);
    });

    it("should convert bare youtu.be URL to embed format", () => {
      const input = "https://youtu.be/dQw4w9WgXcQ";
      const expected =
        "[https://youtu.be/dQw4w9WgXcQ](https://youtu.be/dQw4w9WgXcQ)";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(expected);
    });

    it("should not convert URLs that do not match embed patterns", () => {
      const input = "https://example.com/some-page";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(input);
    });

    it("should not convert URLs that are already in markdown link format", () => {
      const input =
        "[https://www.youtube.com/watch?v=dQw4w9WgXcQ](https://www.youtube.com/watch?v=dQw4w9WgXcQ)";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(input);
    });

    it("should not convert URLs that have link text", () => {
      const input =
        "[Watch this video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(input);
    });

    it("should not convert URLs that are part of other text on the same line", () => {
      const input =
        "Check out https://www.youtube.com/watch?v=dQw4w9WgXcQ video";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(input);
    });

    it("should handle multiple lines with mixed content", () => {
      const input = `Here is some text.

https://www.youtube.com/watch?v=dQw4w9WgXcQ

And some more text.

https://example.com/not-an-embed

https://vimeo.com/987654321`;

      const expected = `Here is some text.

[https://www.youtube.com/watch?v=dQw4w9WgXcQ](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

And some more text.

https://example.com/not-an-embed

[https://vimeo.com/987654321](https://vimeo.com/987654321)`;

      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(expected);
    });

    it("should preserve leading whitespace", () => {
      const input = "  https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      const expected =
        "  [https://www.youtube.com/watch?v=dQw4w9WgXcQ](https://www.youtube.com/watch?v=dQw4w9WgXcQ)";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(expected);
    });

    it("should handle empty string", () => {
      expect(convertBareUrlsToEmbedMarkdown("")).toBe("");
    });

    it("should handle text with no URLs", () => {
      const input = "This is just regular text with no URLs.";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(input);
    });

    it("should convert Spotify URLs", () => {
      const input = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT";
      const expected =
        "[https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT](https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT)";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(expected);
    });

    it("should convert Loom URLs", () => {
      const input = "https://www.loom.com/share/abc123def456";
      const expected =
        "[https://www.loom.com/share/abc123def456](https://www.loom.com/share/abc123def456)";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(expected);
    });

    it("should convert Figma URLs", () => {
      // Figma regex requires 22-128 character file IDs
      const input =
        "https://www.figma.com/file/abcdefghij1234567890AB/Design-File";
      const expected =
        "[https://www.figma.com/file/abcdefghij1234567890AB/Design-File](https://www.figma.com/file/abcdefghij1234567890AB/Design-File)";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(expected);
    });

    it("should handle trailing whitespace on lines", () => {
      const input = "https://www.youtube.com/watch?v=dQw4w9WgXcQ   ";
      // Trailing whitespace is trimmed, so the URL still gets converted
      const expected =
        "[https://www.youtube.com/watch?v=dQw4w9WgXcQ](https://www.youtube.com/watch?v=dQw4w9WgXcQ)";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(expected);
    });

    it("should not convert URLs with text before them", () => {
      const input = "Video: https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(input);
    });
  });
});
