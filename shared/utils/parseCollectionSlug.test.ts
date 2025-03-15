import sharedEnv from "../env";
import parseCollectionSlug from "./parseCollectionSlug";

sharedEnv.URL = "https://app.outline.dev";

describe("#parseCollectionSlug", () => {
  it("should work with fully qualified url", () => {
    expect(
      parseCollectionSlug("http://example.com/collection/test-ANzZwgv2RG")
    ).toEqual("test-ANzZwgv2RG");
  });

  it("should work with paths after document slug", () => {
    expect(
      parseCollectionSlug(
        "http://mywiki.getoutline.com/collection/test-ANzZwgv2RG/recent"
      )
    ).toEqual("test-ANzZwgv2RG");
  });

  it("should work with hash", () => {
    expect(
      parseCollectionSlug(
        "http://mywiki.getoutline.com/collection/test-ANzZwgv2RG#state"
      )
    ).toEqual("test-ANzZwgv2RG");
  });

  it("should work with subdomain qualified url", () => {
    expect(
      parseCollectionSlug(
        "http://mywiki.getoutline.com/collection/test-ANzZwgv2RG"
      )
    ).toEqual("test-ANzZwgv2RG");
  });

  it("should work with path", () => {
    expect(parseCollectionSlug("/collection/test-ANzZwgv2RG")).toEqual(
      "test-ANzZwgv2RG"
    );
  });

  it("should work with path and hash", () => {
    expect(parseCollectionSlug("/collection/test-ANzZwgv2RG#somehash")).toEqual(
      "test-ANzZwgv2RG"
    );
  });
});
