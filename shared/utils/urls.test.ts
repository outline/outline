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
  });

  it("should return true for valid urls", () => {
    expect(urlsUtils.isUrl("http://example.com")).toBe(true);
    expect(urlsUtils.isUrl("https://www.example.com")).toBe(true);
    expect(urlsUtils.isUrl("seafile://openfile")).toBe(true);
    expect(urlsUtils.isUrl("figma://launch")).toBe(true);
    expect(urlsUtils.isUrl("outline:https://getoutline.com")).toBe(true);
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
    expect(regex?.test("https://docs.google.com")).toBe(true);
    expect(regex?.test("https://docs.google.com/")).toBe(true);
    expect(regex?.test("https://docs.google.com/d/123")).toBe(true);
    expect(regex?.test("http://google.com")).toBe(false);
    expect(regex?.test("http://docs.google.com")).toBe(false);
    expect(regex?.test("http://docs.google.com/")).toBe(false);
    expect(regex?.test("http://docs.google.com/d/123")).toBe(false);
  });
});
