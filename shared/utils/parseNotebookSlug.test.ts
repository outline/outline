import sharedEnv from "../env";
import parseNotebookSlug from "./parseNotebookSlug";
sharedEnv.URL = "https://app.outline.dev";
describe("#parseNotebookSlug", () => {
  it("should work with fully qualified url", () => {
    expect(
      parseNotebookSlug("http://example.com/notebook/test-ANzZwgv2RG")
    ).toEqual("test-ANzZwgv2RG");
  });
  it("should work with paths after document slug", () => {
    expect(
      parseNotebookSlug(
        "http://mywiki.getoutline.com/notebook/test-ANzZwgv2RG/recent"
      )
    ).toEqual("test-ANzZwgv2RG");
  });
  it("should work with hash", () => {
    expect(
      parseNotebookSlug(
        "http://mywiki.getoutline.com/notebook/test-ANzZwgv2RG#state"
      )
    ).toEqual("test-ANzZwgv2RG");
  });
  it("should work with subdomain qualified url", () => {
    expect(
      parseNotebookSlug("http://mywiki.getoutline.com/notebook/test-ANzZwgv2RG")
    ).toEqual("test-ANzZwgv2RG");
  });
  it("should work with path", () => {
    expect(parseNotebookSlug("/notebook/test-ANzZwgv2RG")).toEqual(
      "test-ANzZwgv2RG"
    );
  });
  it("should work with path and hash", () => {
    expect(parseNotebookSlug("/notebook/test-ANzZwgv2RG#somehash")).toEqual(
      "test-ANzZwgv2RG"
    );
  });
  it("should support legacy collection paths", () => {
    expect(parseNotebookSlug("/collection/test-ANzZwgv2RG")).toEqual(
      "test-ANzZwgv2RG"
    );
  });
  it("should support plural legacy collection paths", () => {
    expect(parseNotebookSlug("/collections/test-ANzZwgv2RG")).toEqual(
      "test-ANzZwgv2RG"
    );
  });
});
