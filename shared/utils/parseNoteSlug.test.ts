import sharedEnv from "../env";
import parseNoteSlug from "./parseNoteSlug";
sharedEnv.URL = "https://app.outline.dev";
describe("#parseNoteSlug", () => {
  it("should work with fully qualified url", () => {
    expect(parseNoteSlug("http://example.com/doc/my-doc-y4j4tR4UuV")).toEqual(
      "my-doc-y4j4tR4UuV"
    );
  });
  it("should work with paths after document slug", () => {
    expect(
      parseNoteSlug("http://mywiki.getoutline.com/doc/my-doc-y4j4tR4UuV/edit")
    ).toEqual("my-doc-y4j4tR4UuV");
  });
  it("should work with hash", () => {
    expect(
      parseNoteSlug("http://mywiki.getoutline.com/doc/my-doc-y4j4tR4UuV#state")
    ).toEqual("my-doc-y4j4tR4UuV");
  });
  it("should work with subdomain qualified url", () => {
    expect(
      parseNoteSlug("http://mywiki.getoutline.com/doc/my-doc-y4j4tR4UuV")
    ).toEqual("my-doc-y4j4tR4UuV");
  });
  it("should work with path", () => {
    expect(parseNoteSlug("/doc/my-doc-y4j4tR4UuV")).toEqual(
      "my-doc-y4j4tR4UuV"
    );
  });
  it("should work with path and hash", () => {
    expect(parseNoteSlug("/doc/my-doc-y4j4tR4UuV#my-heading-hash")).toEqual(
      "my-doc-y4j4tR4UuV"
    );
  });
});
