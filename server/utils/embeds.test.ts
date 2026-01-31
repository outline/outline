import fetchMock from "jest-fetch-mock";
import { checkEmbeddability } from "./embeds";

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

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
      expect(result).toEqual({ embeddable: true });
    });

    it("should return embeddable: false when X-Frame-Options: DENY", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: { "X-Frame-Options": "DENY" },
      });

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
      expect(result).toEqual({ embeddable: false, reason: "x-frame-options" });
    });

    it("should return embeddable: false when X-Frame-Options: SAMEORIGIN", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: { "X-Frame-Options": "SAMEORIGIN" },
      });

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
      expect(result).toEqual({ embeddable: false, reason: "x-frame-options" });
    });

    it("should return embeddable: false when X-Frame-Options: ALLOW-FROM", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: { "X-Frame-Options": "ALLOW-FROM https://example.com" },
      });

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
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

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
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

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
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

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
      expect(result).toEqual({ embeddable: true });
    });

    it("should return embeddable: false when CSP frame-ancestors has specific origins", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: {
          "Content-Security-Policy": "frame-ancestors https://allowed-site.com",
        },
      });

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
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

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
      expect(result).toEqual({ embeddable: false, reason: "coep" });
    });

    it("should return embeddable: true when COEP is unsafe-none", async () => {
      fetchMock.mockResponseOnce("", {
        status: 200,
        headers: { "Cross-Origin-Embedder-Policy": "unsafe-none" },
      });

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
      expect(result).toEqual({ embeddable: true });
    });

    it("should return embeddable: false when server returns 403", async () => {
      fetchMock.mockResponseOnce("", {
        status: 403,
        headers: {},
      });

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
      expect(result).toEqual({ embeddable: false, reason: "http-error" });
    });

    it("should return embeddable: false when server returns 404", async () => {
      fetchMock.mockResponseOnce("", {
        status: 404,
        headers: {},
      });

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
      expect(result).toEqual({ embeddable: false, reason: "http-error" });
    });

    it("should return embeddable: true on timeout (optimistic)", async () => {
      fetchMock.mockAbortOnce();

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
      expect(result).toEqual({ embeddable: true });
    });

    it("should return embeddable: true on network error (optimistic)", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      const result = await checkEmbeddability(
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      );
      expect(result).toEqual({ embeddable: true });
    });
  });
});
