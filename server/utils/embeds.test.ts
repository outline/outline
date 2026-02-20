import fetchMock from "jest-fetch-mock";
import { checkEmbeddability, convertBareUrlsToEmbedMarkdown } from "./embeds";

beforeEach(() => {
  fetchMock.resetMocks();
});

describe("checkEmbeddability", () => {
  describe("when URL doesn't match any embed pattern", () => {
    it("should return embeddable: false with reason: no-match for non-http URLs", async () => {
      // The generic embed only matches http/https URLs
      const result = await checkEmbeddability("file:///local/path");
      expect(result).toEqual({ embeddable: false, reason: "no-match" });
    });

    it("should return embeddable: false with reason: no-match for invalid URLs", async () => {
      const result = await checkEmbeddability("not-a-valid-url");
      expect(result).toEqual({ embeddable: false, reason: "no-match" });
    });
  });

  describe("when URL matches an embed pattern", () => {
    it("should return embeddable: true when no restrictive headers", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: {},
      });

      const result = await checkEmbeddability("https://www.example.com/embed");
      expect(result).toEqual({ embeddable: true });
    });

    it("should return embeddable: false when X-Frame-Options: DENY", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: { "X-Frame-Options": "DENY" },
      });

      const result = await checkEmbeddability("https://www.example.com/embed");
      expect(result).toEqual({ embeddable: false, reason: "x-frame-options" });
    });

    it("should return embeddable: false when X-Frame-Options: SAMEORIGIN", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: { "X-Frame-Options": "SAMEORIGIN" },
      });

      const result = await checkEmbeddability("https://www.example.com/embed");
      expect(result).toEqual({ embeddable: false, reason: "x-frame-options" });
    });

    it("should return embeddable: false when X-Frame-Options: ALLOW-FROM", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: { "X-Frame-Options": "ALLOW-FROM https://example.com" },
      });

      const result = await checkEmbeddability("https://www.example.com/embed");
      expect(result).toEqual({ embeddable: false, reason: "x-frame-options" });
    });

    it("should return embeddable: false when CSP frame-ancestors is 'none'", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: {
          "Content-Security-Policy":
            "default-src 'self'; frame-ancestors 'none'",
        },
      });

      const result = await checkEmbeddability("https://www.example.com/embed");
      expect(result).toEqual({
        embeddable: false,
        reason: "csp-frame-ancestors",
      });
    });

    it("should return embeddable: false when CSP frame-ancestors is 'self'", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: {
          "Content-Security-Policy": "frame-ancestors 'self'",
        },
      });

      const result = await checkEmbeddability("https://www.example.com/embed");
      expect(result).toEqual({
        embeddable: false,
        reason: "csp-frame-ancestors",
      });
    });

    it("should return embeddable: true when CSP frame-ancestors is *", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: {
          "Content-Security-Policy": "frame-ancestors *",
        },
      });

      const result = await checkEmbeddability("https://www.example.com/embed");
      expect(result).toEqual({ embeddable: true });
    });

    it("should return embeddable: false when CSP frame-ancestors has specific origins", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: {
          "Content-Security-Policy": "frame-ancestors https://allowed-site.com",
        },
      });

      const result = await checkEmbeddability("https://www.example.com/embed");
      expect(result).toEqual({
        embeddable: false,
        reason: "csp-frame-ancestors",
      });
    });

    it("should return embeddable: false when COEP is require-corp", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: { "Cross-Origin-Embedder-Policy": "require-corp" },
      });

      const result = await checkEmbeddability("https://www.example.com/embed");
      expect(result).toEqual({ embeddable: false, reason: "coep" });
    });

    it("should return embeddable: true when COEP is unsafe-none", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: { "Cross-Origin-Embedder-Policy": "unsafe-none" },
      });

      const result = await checkEmbeddability("https://www.example.com/embed");
      expect(result).toEqual({ embeddable: true });
    });

    it("should return embeddable: false when server returns 403", async () => {
      fetchMock.mockResponseOnce("", {
        status: 403,
        headers: {},
      });

      const result = await checkEmbeddability(
        "https://www.example.com/forbiddenpage"
      );
      expect(result).toEqual({ embeddable: false, reason: "http-error" });
    });

    it("should return embeddable: false when server returns 404", async () => {
      fetchMock.mockResponseOnce("", {
        status: 404,
        headers: {},
      });

      const result = await checkEmbeddability(
        "https://www.example.com/nonexistentpage"
      );
      expect(result).toEqual({ embeddable: false, reason: "http-error" });
    });

    it("should return embeddable: true on timeout (optimistic)", async () => {
      fetchMock.mockAbortOnce();

      const result = await checkEmbeddability("https://www.example.com/embed");
      expect(result).toEqual({ embeddable: true, reason: "timeout" });
    });

    it("should return embeddable: true on network error (optimistic)", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      const result = await checkEmbeddability("https://www.example.com/embed");
      expect(result).toEqual({ embeddable: true, reason: "timeout" });
    });
  });

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
        "[https://www.example.com/embed](https://www.example.com/embed)";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(input);
    });

    it("should not convert URLs that have link text", () => {
      const input = "[Watch this video](https://www.example.com/embed)";
      expect(convertBareUrlsToEmbedMarkdown(input)).toBe(input);
    });

    it("should not convert URLs that are part of other text on the same line", () => {
      const input = "Check out https://www.example.com/embed video";
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
