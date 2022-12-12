import * as urlsUtils from "./urls";
import { urlRegex } from "./urls";

describe("IsUrl Method", () => {
  it("should return false for invalid url", () => {
    expect(urlsUtils.isUrl("")).toBe(false);
    expect(urlsUtils.isUrl("#invalidurl")).toBe(false);
    expect(urlsUtils.isUrl("mailto:")).toBe(false);
    expect(urlsUtils.isUrl("sms:")).toBe(false);
    expect(urlsUtils.isUrl("://")).toBe(false);
  });

  it("should return true for valid urls", () => {
    expect(urlsUtils.isUrl("http://example.com")).toBe(true);
    expect(urlsUtils.isUrl("https://www.example.com")).toBe(true);
    expect(urlsUtils.isUrl("seafile://openfile")).toBe(true);
    expect(urlsUtils.isUrl("figma://launch")).toBe(true);
    expect(urlsUtils.isUrl("outline:https://getoutline.com")).toBe(true);
  });
});

describe("isInternalUrl Method", () => {
  it("should return false if empty string", () => {
    expect(urlsUtils.isInternalUrl("")).toBe(false);
  });

  it("should return true if starting with relative path", () => {
    expect(urlsUtils.isInternalUrl("/drafts")).toEqual(true);
  });
});

describe("isExternalUrl Method", () => {
  it("should return false if empty url", () => {
    expect(urlsUtils.isExternalUrl("")).toBe(false);
  });

  it("should return false if internal url", () => {
    expect(urlsUtils.isExternalUrl("/drafts")).toBe(false);
  });
});

describe("sanitizeUrl Method", () => {
  it("should return undefined if not url", () => {
    expect(urlsUtils.sanitizeUrl(undefined)).toBeUndefined();
    expect(urlsUtils.sanitizeUrl(null)).toBeUndefined();
    expect(urlsUtils.sanitizeUrl("")).toBeUndefined();
  });

  it("should append https:// to non-special urls", () => {
    expect(urlsUtils.sanitizeUrl("www.google.com")).toEqual(
      "https://www.google.com"
    );
  });

  describe("special urls", () => {
    it("should return the url as it's if starting with /", () => {
      expect(urlsUtils.sanitizeUrl("/drafts")).toEqual("/drafts");
    });
    it("should return the url as it's if starting with #", () => {
      expect(urlsUtils.sanitizeUrl("#home")).toEqual("#home");
    });
    it("should return the url as it's if it's mailto:", () => {
      expect(urlsUtils.sanitizeUrl("mailto:outline@getoutline.com")).toEqual(
        "mailto:outline@getoutline.com"
      );
    });
    it("should return the url as it's if it's mailto:", () => {
      expect(urlsUtils.sanitizeUrl("mailto:outline@getoutline.com")).toEqual(
        "mailto:outline@getoutline.com"
      );
    });
    it("should return the url as it's if it's sms:, fax:, tel:", () => {
      expect(urlsUtils.sanitizeUrl("mailto:outline@getoutline.com")).toEqual(
        "mailto:outline@getoutline.com"
      );
      expect(urlsUtils.sanitizeUrl("tel:0123456789")).toEqual("tel:0123456789");
      expect(urlsUtils.sanitizeUrl("fax:0123456789")).toEqual("fax:0123456789");
      expect(urlsUtils.sanitizeUrl("sms:0123456789")).toEqual("sms:0123456789");
    });
    it("should return the url as it's if it's a special protocol", () => {
      expect(urlsUtils.sanitizeUrl("mqtt://getoutline.com")).toEqual(
        "mqtt://getoutline.com"
      );
    });
  });

  describe("Blocked protocols", () => {
    it("should be sanitized", () => {
      expect(urlsUtils.sanitizeUrl("file://localhost.com/outline.txt")).toEqual(
        "https://file://localhost.com/outline.txt"
      );
      expect(urlsUtils.sanitizeUrl("javascript:whatever")).toEqual(
        "https://javascript:whatever"
      );
      expect(
        urlsUtils.sanitizeUrl("data:text/html,<script>alert('hi');</script>")
      ).toEqual("https://data:text/html,<script>alert('hi');</script>");
      expect(urlsUtils.sanitizeUrl("vbscript:whatever")).toEqual(
        "https://vbscript:whatever"
      );
    });
  });
});

describe("#urlRegex", () => {
  it("should return undefined for invalid urls", () => {
    expect(urlRegex(undefined)).toBeUndefined();
    expect(urlRegex(null)).toBeUndefined();
    expect(urlRegex("invalid url!")).toBeUndefined();
  });

  it("should return corresponding regex otherwise", () => {
    const regex = urlRegex("https://docs.google.com");
    expect(regex?.source).toBe(/https:\/\/docs\.google\.com/.source);
  });
});
