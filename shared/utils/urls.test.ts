import env from "../env";
import * as urlsUtils from "./urls";
import { urlRegex } from "./urls";

describe("isUrl", () => {
  it("should return false for invalid url", () => {
    expect(urlsUtils.isUrl("")).toBe(false);
    expect(urlsUtils.isUrl("#invalidurl")).toBe(false);
    expect(urlsUtils.isUrl("mailto:")).toBe(false);
    expect(urlsUtils.isUrl("sms:")).toBe(false);
    expect(urlsUtils.isUrl("://")).toBe(false);
    expect(urlsUtils.isUrl("www.example.com")).toBe(false);
  });

  it("should return true for valid urls", () => {
    expect(urlsUtils.isUrl("http://example.com")).toBe(true);
    expect(urlsUtils.isUrl("https://www.example.com")).toBe(true);
    expect(urlsUtils.isUrl("seafile://openfile")).toBe(true);
    expect(urlsUtils.isUrl("figma://launch")).toBe(true);
    expect(urlsUtils.isUrl("outline:https://getoutline.com")).toBe(true);
    expect(urlsUtils.isUrl("www.example.com", { requireProtocol: false })).toBe(
      true
    );
  });

  describe("requireHttps option", () => {
    it("should reject HTTP URLs when requireHttps is true", () => {
      expect(
        urlsUtils.isUrl("http://example.com", { requireHttps: true })
      ).toBe(false);
      expect(
        urlsUtils.isUrl("http://example.com/callback", { requireHttps: true })
      ).toBe(false);
      expect(
        urlsUtils.isUrl("http://localhost:3000/auth", { requireHttps: true })
      ).toBe(false);
    });

    it("should accept HTTPS URLs when requireHttps is true", () => {
      expect(
        urlsUtils.isUrl("https://example.com", { requireHttps: true })
      ).toBe(true);
      expect(
        urlsUtils.isUrl("https://example.com/callback", { requireHttps: true })
      ).toBe(true);
      expect(
        urlsUtils.isUrl("https://localhost:3000/auth", { requireHttps: true })
      ).toBe(true);
    });

    it("should accept HTTP URLs when requireHttps is false or not specified", () => {
      expect(urlsUtils.isUrl("http://example.com")).toBe(true);
      expect(
        urlsUtils.isUrl("http://example.com", { requireHttps: false })
      ).toBe(true);
    });

    it("should allow custom protocols when requireHttps is true", () => {
      expect(
        urlsUtils.isUrl("seafile://openfile", { requireHttps: true })
      ).toBe(true);
      expect(urlsUtils.isUrl("figma://launch", { requireHttps: true })).toBe(
        true
      );
      expect(urlsUtils.isUrl("myapp://callback", { requireHttps: true })).toBe(
        true
      );
    });
  });
});

describe("isBase64Url", () => {
  it("should return false for invalid url", () => {
    expect(urlsUtils.isBase64Url("")).toBe(false);
    expect(urlsUtils.isBase64Url("#invalidurl")).toBe(false);
    expect(urlsUtils.isBase64Url("http://example.com")).toBe(false);
    expect(urlsUtils.isBase64Url("https://www.example.com")).toBe(false);
    expect(urlsUtils.isBase64Url("seafile://openfile")).toBe(false);
    expect(urlsUtils.isBase64Url("figma://launch")).toBe(false);
    expect(urlsUtils.isBase64Url("outline:https://getoutline.com")).toBe(false);
    expect(urlsUtils.isBase64Url("://")).toBe(false);
  });

  it("should return true for valid urls", () => {
    expect(
      urlsUtils.isBase64Url(
        "data:image/png;base64,R0lGODlhPQBEAPeoAJosM//AwO/AwHVYZ/z595kzAP/s7P+goOXMv8+fhw/v739/f+8PD98fH/8mJl+fn/9ZWb8/PzWlwv///6wWGbImAPgTEMImIN9gUFCEm/gDALULDN8PAD6atYdCTX9gUNKlj8wZAKUsAOzZz+UMAOsJAP/Z2ccMDA8PD/95eX5NWvsJCOVNQPtfX/8zM8+QePLl38MGBr8JCP+zs9myn/8GBqwpAP/GxgwJCPny78lzYLgjAJ8vAP9fX/+MjMUcAN8zM/9wcM8ZGcATEL+QePdZWf/29uc/P9cmJu9MTDImIN+/r7+/vz8/P8VNQGNugV8AAF9fX8swMNgTAFlDOICAgPN"
      )
    ).toBeTruthy();
    expect(
      urlsUtils.isBase64Url(
        "data:image/gif;base64,npkM+fOqD6DDj1aZpITp0dtGCDhr+fVuCu3zlg49ijaokTZTo27uG7Gjn2P+hI8+PDPERoUB318bWbfAJ5sUNFcuGRTYUqV/3ogfXp1rWlMc6awJjiAAd2fm4ogXjz56aypOoIde4OE5u/F9x199dlXnnGiHZWEYbGpsAEA3QXYnHwEFliKAgswgJ8LPeiUXGwedCAKABACCN+EA1pYIIYaFlcDhytd51sGAJbo3onOpajiihlO92KHGaUXGwWjUBChjSPiWJuOO/LYIm4v1tXfE6J4gCSJEZ7YgRYUNrkji9P55sF/ogxw5ZkSqIDaZBV6aSGYq/lGZplndkckZ98xoICbTcIJGQAZc"
      )
    ).toBeTruthy();
  });
});

describe("isInternalUrl", () => {
  beforeEach(() => {
    env.URL = "https://example.com:3000";
  });

  it("should return false if empty string", () => {
    expect(urlsUtils.isInternalUrl("")).toBe(false);
  });

  it("should return false if port is different", () => {
    expect(urlsUtils.isInternalUrl("https://example.com:4000")).toBe(false);
  });

  it("should return false if port is missing", () => {
    expect(urlsUtils.isInternalUrl("https://example.com")).toBe(false);
  });

  it("should return true if starting with relative path", () => {
    expect(urlsUtils.isInternalUrl("/drafts")).toEqual(true);
  });
});

describe("isExternalUrl", () => {
  it("should return false if empty url", () => {
    expect(urlsUtils.isExternalUrl("")).toBe(false);
  });

  it("should return false if internal url", () => {
    expect(urlsUtils.isExternalUrl("/drafts")).toBe(false);
  });
});

describe("sanitizeUrl", () => {
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
    it("should return the url unchanged if it's geo:", () => {
      expect(urlsUtils.sanitizeUrl("geo:37.786971,-122.399677")).toEqual(
        "geo:37.786971,-122.399677"
      );
    });
    it("should return the url unchanged if it's maps:", () => {
      expect(urlsUtils.sanitizeUrl("maps:?q=Eiffel+Tower")).toEqual(
        "maps:?q=Eiffel+Tower"
      );
    });
    it("should return the url unchanged if it's magnet:", () => {
      expect(
        urlsUtils.sanitizeUrl("magnet:?xt=urn:btih:abc123&dn=file")
      ).toEqual("magnet:?xt=urn:btih:abc123&dn=file");
    });
    it("should handle uppercase scheme", () => {
      expect(urlsUtils.sanitizeUrl("GEO:37.786971,-122.399677")).toEqual(
        "GEO:37.786971,-122.399677"
      );
    });
    it("should return the url as it's if it's a special protocol", () => {
      expect(urlsUtils.sanitizeUrl("mqtt://getoutline.com")).toEqual(
        "mqtt://getoutline.com"
      );
    });
  });

  describe("Blocked protocols", () => {
    it("should sanitize base64-encoded image data URIs (links should not embed data)", () => {
      expect(
        urlsUtils.sanitizeUrl(
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        )
      ).toEqual(
        "https://data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
      );
    });

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

describe("sanitizeImageSrc", () => {
  it("should return undefined if not a src", () => {
    expect(urlsUtils.sanitizeImageSrc(undefined)).toBeUndefined();
    expect(urlsUtils.sanitizeImageSrc(null)).toBeUndefined();
    expect(urlsUtils.sanitizeImageSrc("")).toBeUndefined();
  });

  it("should return base64-encoded image data URIs unchanged", () => {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    expect(urlsUtils.sanitizeImageSrc(png)).toEqual(png);
    const gif =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    expect(urlsUtils.sanitizeImageSrc(gif)).toEqual(gif);
    const jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    expect(urlsUtils.sanitizeImageSrc(jpeg)).toEqual(jpeg);
    const webp = "data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAA";
    expect(urlsUtils.sanitizeImageSrc(webp)).toEqual(webp);
    const avif = "data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAGF2aWY";
    expect(urlsUtils.sanitizeImageSrc(avif)).toEqual(avif);
  });

  it("should sanitize svg data URIs (can contain inline scripts)", () => {
    expect(
      urlsUtils.sanitizeImageSrc("data:image/svg+xml;base64,PHN2Zy8+")
    ).toEqual("https://data:image/svg+xml;base64,PHN2Zy8+");
    expect(
      urlsUtils.sanitizeImageSrc("data:image/svg;base64,PHN2Zy8+")
    ).toEqual("https://data:image/svg;base64,PHN2Zy8+");
    expect(
      urlsUtils.sanitizeImageSrc("data:image/SVG+XML;base64,PHN2Zy8+")
    ).toEqual("https://data:image/SVG+XML;base64,PHN2Zy8+");
    expect(
      urlsUtils.sanitizeImageSrc("data:image/svg+xml,<svg></svg>")
    ).toEqual("https://data:image/svg+xml,<svg></svg>");
  });

  it("should sanitize non-image data URIs", () => {
    expect(
      urlsUtils.sanitizeImageSrc("data:text/html,<script>alert('hi');</script>")
    ).toEqual("https://data:text/html,<script>alert('hi');</script>");
  });

  it("should fall through to sanitizeUrl behavior for non-data-URI input", () => {
    expect(urlsUtils.sanitizeImageSrc("https://example.com/a.png")).toEqual(
      "https://example.com/a.png"
    );
    expect(urlsUtils.sanitizeImageSrc("/uploads/a.png")).toEqual(
      "/uploads/a.png"
    );
    expect(urlsUtils.sanitizeImageSrc("javascript:alert(1)")).toEqual(
      "https://javascript:alert(1)"
    );
  });
});

describe("parseShareIdFromUrl", () => {
  it("should return share id from url with doc path", () => {
    expect(
      urlsUtils.parseShareIdFromUrl(
        "https://app.example.com/s/my-share/doc/test-abc123"
      )
    ).toBe("my-share");
  });

  it("should return share uuid from url", () => {
    expect(
      urlsUtils.parseShareIdFromUrl(
        "https://app.example.com/s/2767ba0e-ac5c-4533-b9cf-4f5fc456600e/doc/test-abc123"
      )
    ).toBe("2767ba0e-ac5c-4533-b9cf-4f5fc456600e");
  });

  it("should return share id when no doc path is present", () => {
    expect(
      urlsUtils.parseShareIdFromUrl("https://app.example.com/s/my-share")
    ).toBe("my-share");
  });

  it("should return undefined for non-share urls", () => {
    expect(
      urlsUtils.parseShareIdFromUrl("https://app.example.com/doc/test-abc123")
    ).toBeUndefined();
  });

  it("should return undefined for invalid urls", () => {
    expect(urlsUtils.parseShareIdFromUrl("not a url")).toBeUndefined();
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
    expect(regex?.test("https://docs.google.com")).toBe(true);
    expect(regex?.test("https://docs.google.com/")).toBe(true);
    expect(regex?.test("https://docs.google.com/d/123")).toBe(true);
    expect(regex?.test("http://google.com")).toBe(false);
    expect(regex?.test("http://docs.google.com")).toBe(false);
    expect(regex?.test("http://docs.google.com/")).toBe(false);
    expect(regex?.test("http://docs.google.com/d/123")).toBe(false);
  });
});
