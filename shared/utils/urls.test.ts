import * as urlsUtils from "./urls";

describe("IsUrl Method", () => {
  describe("invalid urls", () => {
    it("should return false", () => {
      expect(urlsUtils.isUrl("")).toEqual(false);
      expect(urlsUtils.isUrl("#invalidurl")).toEqual(false);
      expect(urlsUtils.isUrl("mailto:")).toEqual(false);
      expect(urlsUtils.isUrl("://")).toEqual(false);
    });
  });
});

describe("isInternalUrl Method", () => {
  it("should return false if empty string", () => {
    expect(urlsUtils.isInternalUrl("")).toEqual(false);
  });

  it("should return true if starting with relative path", () => {
    expect(urlsUtils.isInternalUrl("/drafts")).toEqual(true);
  });
});

describe("isExternalUrl Method", () => {
  it("should return false if empty url", () => {
    expect(urlsUtils.isExternalUrl("")).toEqual(false);
  });

  it("should return false if internal url", () => {
    expect(urlsUtils.isExternalUrl("/drafts")).toEqual(false);
  });
});

describe("sanitizeUrl Method", () => {
  it("should return undefined if not url", () => {
    expect(urlsUtils.sanitizeUrl(undefined)).toEqual(undefined);
    expect(urlsUtils.sanitizeUrl(null)).toEqual(undefined);
    expect(urlsUtils.sanitizeUrl("")).toEqual(undefined);
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
    it("should return the url as it's if it's a special domain", () => {
      expect(urlsUtils.sanitizeUrl("mqtt://getoutline.com")).toEqual(
        "mqtt://getoutline.com"
      );
    });
  });
});
